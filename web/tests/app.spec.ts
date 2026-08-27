import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";

function trackConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

function navButton(page: Page, name: string | RegExp) {
  // Scoped to the world nav specifically - the homepage funnel also
  // renders buttons/links labelled PRODUCTS/SIGNALS/etc. for its own
  // stage boxes and "Explore X ->" shortcuts, which would otherwise
  // collide with a page-wide getByRole("button", { name }) lookup.
  return page.getByRole("navigation", { name: "Five worlds" }).getByRole("button", { name });
}

async function noDocumentScroll(page: Page) {
  const overflow = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
    clientHeight: document.documentElement.clientHeight,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight + 1);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test.describe("Versuni Disruptive Innovation - core golden path", () => {
  test("loads with correct title, brand, no console errors, no scroll", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/");
    await expect(page).toHaveTitle(/Versuni/);
    await expect(page.getByText("DISRUPTIVE INNOVATION", { exact: true })).toBeVisible();
    await expect(page.getByText("FROM WHAT IS TO WHAT COULD REPLACE IT")).toHaveCount(0);
    await noDocumentScroll(page);
    expect(errors).toEqual([]);
  });

  test("all five worlds are reachable via nav and render real content", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/");
    const expectations = [
      { nav: "PRODUCTS", heading: "WHAT EXISTS?" },
      { nav: "SIGNALS", heading: "WHAT IS CHANGING" },
      { nav: "MAGIC BOX", heading: "PATTERN INTELLIGENCE" },
      { nav: "CRITERIA", heading: "HOW INTELLIGENCE DECIDES" },
      { nav: "INNOVATIONS", heading: "WHAT SHOULD VERSUNI TEST?" },
    ];
    for (const { nav, heading } of expectations) {
      await navButton(page, new RegExp(nav)).click();
      await expect(page.getByText(heading)).toBeVisible({ timeout: 5000 });
      await noDocumentScroll(page);
    }
    expect(errors).toEqual([]);
  });

  test("keyboard navigation (1-5, arrows) moves between worlds", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("3");
    await expect(page.getByText("PATTERN INTELLIGENCE")).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText("HOW INTELLIGENCE DECIDES")).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText("PATTERN INTELLIGENCE")).toBeVisible();
    await page.keyboard.press("1");
    await expect(page.getByText("WHAT EXISTS?")).toBeVisible();
  });

  test("DISTILLED/RAW toggle changes content on Products", async ({ page }) => {
    await page.goto("/");
    await navButton(page, /PRODUCTS/).click();
    await expect(page.getByText("Verified official portfolio")).toBeVisible();
    await page.getByRole("button", { name: "raw" }).click();
    await expect(page.getByText("CONSUMER REVIEW CORPUS")).toBeVisible();
    await expect(page.getByText("Verified official portfolio")).toHaveCount(0);
  });

  test("no text is clipped by an overflow:hidden ancestor at a narrower width", async ({ page }) => {
    // A document-level no-scroll check (see noDocumentScroll) does not
    // catch this class of bug: a flex child missing min-width:0 can force
    // its own content wider than its container and get silently clipped
    // by an ancestor's overflow-x:hidden (e.g. .scrollY), with no visible
    // scrollbar and no document-level overflow to detect. Real bug found
    // via live feedback at a real (narrower-than-1280) window width.
    await page.setViewportSize({ width: 1024, height: 720 });
    await page.goto("/");
    await navButton(page, /PRODUCTS/).click();
    await expect(page.getByText("Verified official portfolio")).toBeVisible({ timeout: 5000 });
    const clipped = await page.evaluate(() => {
      const offenders: string[] = [];
      document.querySelectorAll("main *").forEach((el) => {
        const cs = getComputedStyle(el);
        if (cs.overflow === "hidden" || cs.overflowX === "hidden") return; // intentional clipping (line-clamps etc.)
        if (el.children.length > 0) return; // only check leaf text nodes
        if ((el.textContent ?? "").trim().length < 3) return;
        if (el.scrollWidth > el.clientWidth + 2) offenders.push((el.textContent ?? "").slice(0, 60));
      });
      return offenders;
    });
    expect(clipped).toEqual([]);
  });

  test("real official product images load with no broken images", async ({ page }) => {
    await page.goto("/");
    await navButton(page, /PRODUCTS/).click();
    const images = page.locator('main img[src^="/products/"]');
    await expect(images.first()).toBeVisible({ timeout: 5000 });
    const count = await images.count();
    expect(count).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < count; i++) {
      await expect
        .poll(async () => images.nth(i).evaluate((img: HTMLImageElement) => img.naturalWidth), { timeout: 5000 })
        .toBeGreaterThan(0);
    }
  });

  test("Bets world: decision priority toggle genuinely flips the winner", async ({ page }) => {
    await page.goto("/");
    await navButton(page, /INNOVATIONS/).click();
    await expect(page.getByText("CURRENT WINNER")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("WINNER CHANGED")).toHaveCount(0);
    await page.getByRole("button", { name: "Economic Value override" }).click();
    await expect(page.getByText(/WINNER CHANGED.*baseline OS-1.*now OS-2/)).toBeVisible({ timeout: 10000 });
  });

  test("Trace This Bet resolves real evidence, no fabricated links", async ({ page }) => {
    await page.goto("/");
    await navButton(page, /INNOVATIONS/).click();
    await page.getByRole("button", { name: "raw" }).click();
    await page.getByRole("button", { name: "TRACE THIS INNOVATION →" }).first().click();
    await expect(page.getByText("Trace this bet — evidence, theme, and every concept built on it")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("NO VERIFIED LINK")).toHaveCount(0);
    await expect(page.getByText("◆ SIGNAL").first()).toBeVisible();
  });

  test("Competitors tab (within Signals) shows white space and sends a theme to Magic Box", async ({ page }) => {
    await page.goto("/");
    await navButton(page, /SIGNALS/).click();
    await page.getByRole("button", { name: "COMPETITORS" }).click();
    await expect(page.getByText("Real competitors analysed")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Send to Magic Box →" }).first().click();
    await expect(page.getByText("PATTERN INTELLIGENCE")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Filtered from Competitors' white space/)).toBeVisible();
  });

  test("Sources dock reports honest, non-fabricated statuses", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^SOURCES/ }).click();
    await expect(page.getByText("PubMed / PMC")).toBeVisible();
    await expect(page.getByText("not implemented").first()).toBeVisible();
  });

  test("How We Got Here shows a live, non-empty funnel", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "HOW WE GOT HERE" }).click();
    await expect(page.getByText("Real consumer reviews")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("source unavailable")).toHaveCount(0);
  });

  test("Category Assumption Map is evidence-linked and clickable", async ({ page }) => {
    await page.goto("/");
    await navButton(page, /MAGIC BOX/).click();
    await page.getByRole("button", { name: /CADR/ }).click();
    await expect(page.getByText("WHAT REAL EVIDENCE BEARS ON IT")).toBeVisible({ timeout: 5000 });
  });

  test("Trace This Concept resolves signal/tension/assumption evidence, no fabricated links", async ({ page }) => {
    await page.goto("/");
    await navButton(page, /MAGIC BOX/).click();
    await page.locator("text=real concepts the machine generated").waitFor({ timeout: 5000 });
    await page.locator('[role="button"]').filter({ hasText: "$" }).first().click();
    await page.getByRole("button", { name: "TRACE THIS CONCEPT →" }).click();
    await expect(page.getByText("Trace this concept — signal, tension, and assumption down to their real papers")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("NO VERIFIED LINK")).toHaveCount(0);
    await expect(page.getByText("◆ SIGNAL").first()).toBeVisible();
  });

  test("Criteria page: funnel, Versuni Edge, and a criterion are real and clickable", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/criteria");
    await expect(page).toHaveURL(/\/criteria$/);
    await expect(page.getByText("How Intelligence Decides")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("CRITERIA ARE NOT SCORES. THEY ARE TESTS.")).toBeVisible();
    await expect(page.getByText("VERSUNI EDGE — DIAGNOSTIC, NOT A FOURTH SCORE")).toBeVisible();
    await page.getByRole("button", { name: "V1 · Portfolio leverage" }).click();
    await expect(page.getByText("NEEDS_EVIDENCE: 12")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("No real Versuni internal-capability dataset").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await navButton(page, /PRODUCTS/).click();
    await expect(page).toHaveURL(/\/$/);
    expect(errors).toEqual([]);
  });

  test("Innovation Machine homepage: RADAR through NEW PRODUCTS are real, clickable, and traced", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/");
    await expect(page.getByText("Innovation Machine")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("● RUNNING")).toBeVisible();
    await expect(page.getByText(/SNAPSHOT [0-9a-f]{10}/)).toBeVisible();

    // All six real funnel stages are present as clickable tiles.
    for (const label of ["RADAR", "PATHS", "FIELD", "MAGIC BOX", "INNOVATIONS", "NEW PRODUCTS"]) {
      await expect(page.locator("main button").filter({ hasText: label }).first()).toBeVisible();
    }

    // RADAR opens with real per-family counts; a clickable family jumps to
    // its real page, and the trace is a click away, not dumped by default.
    await page.locator("main button").filter({ hasText: "RADAR" }).first().click();
    await expect(page.getByText(/PRODUCTS/).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/compute_homepage_funnel/)).toHaveCount(0);
    await page.getByRole("button", { name: "▸ source" }).click();
    await expect(page.getByText(/compute_homepage_funnel/)).toBeVisible();
    await page.keyboard.press("Escape");

    // PATHS is honest about what has no real source (never invented) -
    // collapsed by default, revealed on click, never invented either way.
    await page.locator("main button").filter({ hasText: "PATHS" }).first().click();
    await expect(page.getByText("NO VERIFIED DATA")).toHaveCount(0);
    await page.getByText(/ → /).first().click();
    await expect(page.getByText("NO VERIFIED DATA").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/NO VERIFIED NATURE/).first()).toBeVisible();
    await page.keyboard.press("Escape");

    // FIELD is a 1:1 relabelling of the real live decision verdict - short
    // by default, full real text a click away.
    await page.locator("main button").filter({ hasText: "FIELD" }).first().click();
    await expect(page.getByText("Wrong if")).toBeVisible({ timeout: 5000 });
    await page.keyboard.press("Escape");

    // Logo returns home from a deep page.
    await navButton(page, /CRITERIA/).click();
    await expect(page.getByText("How Intelligence Decides")).toBeVisible({ timeout: 5000 });
    await page.getByTitle("Innovation Funnel — home").click();
    await expect(page.getByText("Evidence in. Better bets out.")).toBeVisible({ timeout: 5000 });

    expect(errors).toEqual([]);
  });
});
