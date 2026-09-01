import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

// Shared, reusable table engine — sorting, filtering, grouping, selection.
// Pure infrastructure: no fetch calls, no business logic, no knowledge of
// any particular domain object. "TABLES ARE THE PRIMARY ANALYTICAL LANGUAGE
// OF THE PRODUCT" — this is the shared machinery so every table view gets
// sort/filter/group/select for free instead of reimplementing them.
//
// Explicitly OUT of scope for this pass (do not stub): column resize,
// virtualization, URL-persisted state, keyboard navigation.

export interface Column<T> {
  key: string; // stable id, also used for sort
  label: string; // short human header, Title Case, NOT snake_case
  render: (row: T) => ReactNode; // cell content — caller decides truncation/formatting
  sortValue?: (row: T) => string | number | null | undefined; // if omitted, column is not sortable
  width?: string; // CSS width/minWidth for the column, optional
  align?: "left" | "right" | "center"; // default left
}

export interface GroupOption<T> {
  key: string;
  label: string;
  groupValue: (row: T) => string; // the group this row belongs to; "" / null-ish -> "Ungrouped"
  sortGroups?: (a: string, b: string) => number; // custom group ordering; default alphabetical ("Ungrouped" always last)
}

export interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  groupOptions?: GroupOption<T>[]; // if provided, shows a "Group by: [dropdown]" control; "None" is always an implicit first option
  defaultGroupKey?: string; // key of a GroupOption to start grouped by, or omit for ungrouped
  searchable?: boolean; // if true, shows a text search box that filters rows by a caller-provided searchValue
  searchValue?: (row: T) => string; // required if searchable is true — the haystack text per row
  selectable?: boolean; // if true, shows checkboxes + a selection action bar
  selectionActions?: (selectedRows: T[], clearSelection: () => void) => ReactNode; // rendered in the action bar when selection is non-empty — e.g. a "Send N to Magic Box" button
  emptyMessage?: string; // shown when rows.length === 0, default "No rows."
  defaultSortKey?: string; // a Column key to sort by initially
  defaultSortDir?: "asc" | "desc"; // default "desc"
}

const UNGROUPED_LABEL = "Ungrouped";

const TH_BASE: CSSProperties = {
  textAlign: "left",
  padding: "6px 10px",
  borderBottom: "1px solid var(--line)",
  fontSize: 10.5,
  color: "var(--ink-faint)",
  fontFamily: "var(--font-mono)",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
  position: "sticky",
  top: 0,
  background: "var(--surface)",
  zIndex: 1,
};

const TD_BASE: CSSProperties = {
  padding: "6px 10px",
  borderBottom: "1px solid var(--line)",
  fontSize: 12,
  color: "var(--ink-dim)",
  verticalAlign: "middle",
  overflow: "hidden",
  height: 36,
  boxSizing: "border-box",
};

function compareValues(a: string | number | null | undefined, b: string | number | null | undefined): number {
  const aNil = a === null || a === undefined;
  const bNil = b === null || b === undefined;
  if (aNil && bNil) return 0;
  if (aNil) return -1;
  if (bNil) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  onRowClick,
  groupOptions,
  defaultGroupKey,
  searchable,
  searchValue,
  selectable,
  selectionActions,
  emptyMessage = "No rows.",
  defaultSortKey,
  defaultSortDir = "desc",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);
  const [groupKey, setGroupKey] = useState<string | undefined>(defaultGroupKey);
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const sortCol = sortKey ? columns.find((c) => c.key === sortKey) : undefined;
  const activeGroup = groupKey ? groupOptions?.find((g) => g.key === groupKey) : undefined;

  const filteredRows = useMemo(() => {
    if (!searchable || !search.trim() || !searchValue) return rows;
    const needle = search.trim().toLowerCase();
    return rows.filter((r) => searchValue(r).toLowerCase().includes(needle));
  }, [rows, searchable, search, searchValue]);

  function sortRows(list: T[]): T[] {
    if (!sortCol?.sortValue) return list;
    const sv = sortCol.sortValue;
    const sorted = [...list].sort((a, b) => compareValues(sv(a), sv(b)));
    if (sortDir === "desc") sorted.reverse();
    return sorted;
  }

  // groups: ordered list of [label, rows] — filter first, group, then sort
  // within each group. Groups are ordered alphabetically by label, with
  // "Ungrouped" always sorted last.
  const groups = useMemo((): { label: string; rows: T[] }[] => {
    if (!activeGroup) return [{ label: "", rows: sortRows(filteredRows) }];
    const map = new Map<string, T[]>();
    for (const row of filteredRows) {
      const raw = activeGroup.groupValue(row);
      const label = raw && raw.trim() ? raw : UNGROUPED_LABEL;
      const bucket = map.get(label);
      if (bucket) bucket.push(row);
      else map.set(label, [row]);
    }
    const labels = [...map.keys()].sort((a, b) => {
      if (a === UNGROUPED_LABEL) return 1;
      if (b === UNGROUPED_LABEL) return -1;
      return activeGroup.sortGroups ? activeGroup.sortGroups(a, b) : a.localeCompare(b);
    });
    return labels.map((label) => ({ label, rows: sortRows(map.get(label)!) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRows, activeGroup, sortCol, sortDir]);

  const allSelectableIds = useMemo(() => filteredRows.map((r) => getRowId(r)), [filteredRows, getRowId]);
  const selectedRows = useMemo(() => rows.filter((r) => selected.has(getRowId(r))), [rows, selected, getRowId]);

  const allVisibleSelected = allSelectableIds.length > 0 && allSelectableIds.every((id) => selected.has(id));
  const someVisibleSelected = allSelectableIds.some((id) => selected.has(id));
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
    }
  }, [someVisibleSelected, allVisibleSelected]);

  function toggleSort(col: Column<T>) {
    if (!col.sortValue) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir(defaultSortDir);
    }
  }

  function toggleGroupCollapsed(label: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        for (const id of allSelectableIds) next.delete(id);
        return next;
      }
      const next = new Set(prev);
      for (const id of allSelectableIds) next.add(id);
      return next;
    });
  }

  function toggleRowSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function renderCell(col: Column<T>, row: T) {
    const content = col.render(row);
    const isString = typeof content === "string";
    return (
      <td
        key={col.key}
        style={{
          ...TD_BASE,
          textAlign: col.align ?? "left",
          width: col.width,
          minWidth: col.width,
        }}
      >
        {isString ? (
          <span
            title={content as string}
            style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {content}
          </span>
        ) : (
          content
        )}
      </td>
    );
  }

  function renderRow(row: T) {
    const id = getRowId(row);
    const isSelected = selected.has(id);
    return (
      <tr
        key={id}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
        style={{
          cursor: onRowClick ? "pointer" : "default",
          background: isSelected ? "var(--surface-2)" : "transparent",
          transition: "background 100ms",
        }}
        onMouseEnter={(e) => {
          if (onRowClick) e.currentTarget.style.background = "var(--surface-2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isSelected ? "var(--surface-2)" : "transparent";
        }}
      >
        {selectable && (
          <td style={{ ...TD_BASE, width: 32, minWidth: 32 }} onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleRowSelected(id)}
              style={{ cursor: "pointer" }}
            />
          </td>
        )}
        {columns.map((col) => renderCell(col, row))}
      </tr>
    );
  }

  const colSpan = columns.length + (selectable ? 1 : 0);

  return (
    <div>
      {(searchable || (groupOptions && groupOptions.length > 0)) && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
          {searchable && (
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--surface)",
                color: "var(--ink)",
                fontFamily: "var(--font-body)",
                minWidth: 200,
              }}
            />
          )}
          {groupOptions && groupOptions.length > 0 && (
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11.5, color: "var(--ink-faint)" }}>
              Group by
              <select
                value={groupKey ?? ""}
                onChange={(e) => setGroupKey(e.target.value || undefined)}
                style={{
                  fontSize: 11.5,
                  padding: "5px 8px",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: "var(--surface)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <option value="">None</option>
                {groupOptions.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {selectable && selectedRows.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "8px 12px",
            marginBottom: 10,
            borderRadius: 10,
            border: "1px solid var(--accent-blue)",
            background: "var(--surface-2)",
            position: "sticky",
            top: 0,
            zIndex: 2,
          }}
        >
          <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--accent-blue-ink)", fontWeight: 700 }}>
            {selectedRows.length} selected
          </span>
          {selectionActions?.(selectedRows, clearSelection)}
          <button
            onClick={clearSelection}
            style={{
              marginLeft: "auto",
              fontSize: 11.5,
              color: "var(--ink-faint)",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Clear
          </button>
        </div>
      )}

      <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 12 }}>
        {/* Fixed layout: declared column widths win, long nowrap cell text
            truncates with ellipsis instead of inflating its column into a
            horizontal scroll — "no horizontal scroll as the normal condition". */}
        <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
          <thead>
            <tr>
              {selectable && (
                <th style={{ ...TH_BASE, width: 32, minWidth: 32 }}>
                  <input
                    ref={headerCheckboxRef}
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    style={{ cursor: "pointer" }}
                  />
                </th>
              )}
              {columns.map((col) => {
                const sortable = !!col.sortValue;
                const isActive = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={sortable ? () => toggleSort(col) : undefined}
                    style={{
                      ...TH_BASE,
                      textAlign: col.align ?? "left",
                      width: col.width,
                      minWidth: col.width,
                      cursor: sortable ? "pointer" : "default",
                      userSelect: "none",
                      color: isActive ? "var(--accent-blue-ink)" : TH_BASE.color,
                    }}
                  >
                    {col.label}
                    {isActive && <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "▲" : "▼"}</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={colSpan} style={{ ...TD_BASE, textAlign: "center", color: "var(--ink-faint)", padding: "18px 10px" }}>
                  {emptyMessage}
                </td>
              </tr>
            )}
            {filteredRows.length > 0 &&
              (activeGroup
                ? groups.flatMap((g) => {
                    const collapsed = collapsedGroups.has(g.label);
                    return [
                      <tr key={`group-${g.label}`} onClick={() => toggleGroupCollapsed(g.label)} style={{ cursor: "pointer", background: "var(--surface-2)" }}>
                        <td
                          colSpan={colSpan}
                          style={{
                            ...TD_BASE,
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            letterSpacing: "0.03em",
                            color: "var(--ink)",
                            fontWeight: 700,
                            background: "var(--surface-2)",
                          }}
                        >
                          <span style={{ marginRight: 6, color: "var(--ink-faint)" }}>{collapsed ? "▶" : "▼"}</span>
                          {g.label}
                          <span style={{ marginLeft: 8, color: "var(--ink-faint)", fontWeight: 500 }}>({g.rows.length})</span>
                        </td>
                      </tr>,
                      ...(collapsed ? [] : g.rows.map((row) => renderRow(row))),
                    ];
                  })
                : groups[0].rows.map((row) => renderRow(row)))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
