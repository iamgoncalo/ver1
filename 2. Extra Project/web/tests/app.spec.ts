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
  // Scoped to the machine nav specifically - the homepage overview also
  // renders stage tiles and shortcut buttons with the same world names.
  return page.getByRole("navigation", { name: "The machine" }).getByRole("button", { name });
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

test.describe("Versuni Intelligence Machine - core golden path", () => {
  test("loads with correct title, brand, no console errors, no scroll", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/");
    await expect(page).toHaveTitle(/Versuni/);
    await expect(page.getByText("Intelligence Machine", { exact: true }).first()).toBeVisible();
    await noDocumentScroll(page);
    expect(errors).toEqual([]);
  });

  test("all five machine worlds are reachable via nav, render real content, never scroll the page", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/");
    const expectations = [
      { nav: /^Product universe$/, heading: "what exists today" },
      { nav: /^Radar$/, heading: "what are we observing?" },
      { nav: /^Paths$/, heading: "Where is reality actually moving?" },
      { nav: /^Magic box$/, heading: "what could exist now?" },
      { nav: /^Innovations$/, heading: "which possibilities are becoming serious?" },
    ];
    for (const { nav, heading } of expectations) {
      await navButton(page, nav).click();
      await expect(page.getByText(heading).first()).toBeVisible({ timeout: 5000 });
      await noDocumentScroll(page);
    }
    expect(errors).toEqual([]);
  });

  test("keyboard navigation (0-5, arrows) moves through the machine", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("4");
    await expect(page.getByText("what could exist now?")).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText("which possibilities are becoming serious?")).toBeVisible();
    await page.keyboard.press("ArrowRight"); // clamps at 5
    await expect(page.getByText("which possibilities are becoming serious?")).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText("what could exist now?")).toBeVisible();
    await page.keyboard.press("3");
    await expect(page.getByText("Where is reality actually moving?")).toBeVisible();
    await page.keyboard.press("0");
    await expect(page.getByText("Evidence in. Better bets out.")).toBeVisible();
  });

  test("every world has a working deep link and browser Back is never required", async ({ page }) => {
    for (const [path, marker] of [
      ["/products", "what exists today"],
      ["/radar", "what are we observing?"],
      ["/paths", "Where is reality actually moving?"],
      ["/magic-box", "what could exist now?"],
      ["/innovations", "which possibilities are becoming serious?"],
      ["/criteria", "how the machine decides"],
      // legacy routes fold into their canonical worlds
      ["/field", "Where is reality actually moving?"],
      ["/new-products", "which possibilities are becoming serious?"],
    ] as const) {
      await page.goto(path);
      await expect(page.getByText(marker).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("Distilled/raw toggle changes content on Product universe", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByText("Verified Versuni portfolio").first()).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "raw" }).click();
    await expect(page.getByText("Consumer review corpus")).toBeVisible();
    await expect(page.getByText("Verified Versuni portfolio")).toHaveCount(0);
  });

  test("no text is clipped by an overflow:hidden ancestor at the narrowest supported width", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 700 });
    await page.goto("/products");
    await expect(page.getByText("Verified Versuni portfolio").first()).toBeVisible({ timeout: 5000 });
    const clipped = await page.evaluate(() => {
      const offenders: string[] = [];
      document.querySelectorAll("main *").forEach((el) => {
        const cs = getComputedStyle(el);
        if (cs.overflow === "hidden" || cs.overflowX === "hidden") return;
        if (el.children.length > 0) return;
        if ((el.textContent ?? "").trim().length < 3) return;
        if (el.scrollWidth > el.clientWidth + 2) offenders.push((el.textContent ?? "").slice(0, 60));
      });
      return offenders;
    });
    expect(clipped).toEqual([]);
  });

  test("header and footer never force horizontal page overflow, even at narrow widths", async ({ page }) => {
    for (const width of [461, 700, 900]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "Intelligence Machine" })).toBeVisible({ timeout: 5000 });
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth, `width=${width}`).toBeLessThanOrEqual(overflow.clientWidth + 1);
    }
  });

  test("no shouting all-caps copy leaks into any world", async ({ page }) => {
    // Genuine abbreviations and data ids are fine; three-plus-word shouting
    // sentences are not. Checks rendered text of every world.
    const ALLOWED = /^(API|DOI|PMID|PMCID|URL|PDF|CADR|HEPA|USD|EUR|NL|US|EU|AI|IOT|PM2\.5|CSAT|WTP|OS-\d|TC-R\d+|RP-\d+|CR-\d+|MB|CO2|VOC|UV|LED|WHO|EPA|AHAM|CARB|CSA|CBS|SPA-\w+|[A-Z]{2,6}\d*[A-Z0-9/]*)$/;
    for (const path of ["/", "/products", "/radar", "/paths", "/magic-box", "/innovations", "/criteria"]) {
      await page.goto(path);
      await page.waitForTimeout(600);
      const shouts = await page.evaluate(() => {
        const found: string[] = [];
        document.querySelectorAll("main *, header *, footer *").forEach((el) => {
          if (el.children.length > 0) return;
          const text = (el.textContent ?? "").trim();
          const words = text.split(/\s+/).filter((w) => /^[A-Z][A-Z0-9'’&/-]{2,}$/.test(w));
          if (words.length >= 3 && words.join(" ").length > 14 && text === text.toUpperCase() && /[A-Z]{3}/.test(text)) {
            found.push(text.slice(0, 60));
          }
        });
        return found;
      });
      const real = shouts.filter((s) => !s.split(/\s+/).every((w) => ALLOWED.test(w)));
      expect(real, `world=${path}`).toEqual([]);
    }
  });

  test("real official product images load with no broken images", async ({ page }) => {
    await page.goto("/products");
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

  test("Paths ontology: trajectories/tensions/assumptions are separated, honest, and never inflated", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/paths");
    await expect(page.getByText("Where is reality actually moving?")).toBeVisible({ timeout: 5000 });
    // the three epistemic classes are visually separated sections
    await expect(page.getByText(/Trajectories — where reality is verifiably moving · 0/)).toBeVisible();
    await expect(page.getByText(/Open tensions — evidence pulls both ways · \d+/)).toBeVisible();
    await expect(page.getByText(/Assumptions worth challenging · \d+/)).toBeVisible();
    // zero trajectories is an honest, explained statement - not a hidden gap
    await expect(page.getByTestId("trajectory-empty")).toBeVisible();
    await expect(page.getByTestId("trajectory-empty").getByText(/requires observed temporal/)).toBeVisible();
    // no "N real paths" inflation anywhere
    await expect(page.getByText(/\d+ real paths/)).toHaveCount(0);
    // the forbidden falsifier fallback is dead; a typed test renders instead
    await expect(page.getByText(/no falsifier established/)).toHaveCount(0);
    await expect(page.getByTestId("path-test")).toBeVisible();
    await expect(page.getByText(/What would falsify this|What test would challenge/).first()).toBeVisible();
    // no placeholder rows anywhere
    await expect(page.getByText(/NO VERIFIED DATA/)).toHaveCount(0);
    // selecting another path swaps the inspector without navigation
    const rows = page.locator("main button").filter({ hasText: /Tension|Assumption/ });
    await rows.nth(2).click();
    await expect(page.getByText("Consequences")).toBeVisible();
    await expect(page).toHaveURL(/\/paths(\?|$)/);
    // "Radar evidence" lands on the Research lens, never Product universe
    await page.getByRole("button", { name: "← Radar evidence" }).click();
    await expect(page).toHaveURL(/\/radar\?.*lens=research/);
    await noDocumentScroll(page);
    expect(errors).toEqual([]);
  });

  test("a tension is a trade-off, an assumption is a question - and reclassifications explain themselves", async ({ page }) => {
    // T4 was historically a tension; the machine-checked reclassification
    // must present it as an assumption to test, with its why.
    await page.goto("/paths?path=tension:T4");
    await expect(page.getByText("Assumption to test").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Reclassified from tension/)).toBeVisible();
    await expect(page.getByText(/What test would challenge this assumption/)).toBeVisible();
    // an assumption's counterfactual is presented as a question, never movement
    await page.goto("/paths?path=assumption:A6");
    await expect(page.getByText(/Counterfactual question \(not observed movement\)/)).toBeVisible({ timeout: 5000 });
    // A2's test is a typed machine proposal, never presented as evidence
    await page.goto("/paths?path=assumption:A2");
    await expect(page.getByText("Proposed test — machine proposal, unverified")).toBeVisible({ timeout: 5000 });
  });

  test("Field grounding is path-specific: different paths show different, clickable worlds", async ({ page }) => {
    await page.goto("/paths?path=tension:T1");
    await page.getByRole("button", { name: /Ground it in the field/ }).click();
    await expect(page.getByTestId("path-field")).toBeVisible({ timeout: 5000 });
    // T1 carries consumer-world grounding: friction, products, competitors
    await expect(page.getByText("Friction — click for the real reviews")).toBeVisible();
    await expect(page.getByText("Products carrying this friction")).toBeVisible();
    await expect(page.getByText("Competitors measurably weaker here")).toBeVisible();
    const t1Evidence = await page.getByTestId("path-field").textContent();
    // clicking the friction opens REAL review excerpts in place
    await page.getByTestId("field-friction").first().click();
    await expect(page.getByRole("dialog").getByText(/real Amazon.com customer text/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("dialog").getByText(/CR-\d+/).first()).toBeVisible();
    await page.keyboard.press("Escape");
    // T4's field is genuinely different: sensor papers, no consumer friction
    await page.goto("/paths?path=tension:T4");
    await page.getByRole("button", { name: /Ground it in the field/ }).click();
    await expect(page.getByTestId("path-field")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Friction — click for the real reviews")).toHaveCount(0);
    const t4Evidence = await page.getByTestId("path-field").textContent();
    expect(t4Evidence).not.toBe(t1Evidence);
    // a path with no evidence says so - it never borrows a neighbour's field
    await page.goto("/paths?path=assumption:A7");
    await page.getByRole("button", { name: /Ground it in the field/ }).click();
    await expect(page.getByText(/honestly empty rather than borrowed/)).toBeVisible({ timeout: 5000 });
  });

  test("Magic concept: why-here derivation, clickable lineage, typed envelope, honest comparable price", async ({ page }) => {
    await page.goto("/magic-box?possibility=noise:AMBIENT");
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    // 3-part derivation, with the transformation labelled a method choice
    await expect(page.getByTestId("why-here")).toBeVisible();
    await expect(page.getByTestId("why-here").getByText(/1 · Reality:/)).toBeVisible();
    await expect(page.getByTestId("why-here").getByText(/METHOD CHOICE, not evidence/)).toBeVisible();
    await expect(page.getByTestId("why-here").getByText(/3 · Product consequence:/)).toBeVisible();
    // lineage chips resolve to real parents
    await expect(page.getByTestId("lineage").getByRole("button", { name: /tension:T\d/ }).first()).toBeVisible();
    // engineering envelope: observed comparables carry n + range, unknowns stay unknown
    await expect(page.getByTestId("engineering-envelope").getByText(/observed, \d+ comparables/).first()).toBeVisible();
    await expect(page.getByTestId("engineering-envelope").getByText(/unknown — no comparable publishes this/).first()).toBeVisible();
    // the price is a comparable market median, never the concept's price
    await expect(page.getByText(/comparable market median/).first()).toBeVisible();
    await expect(page.getByText("typical real price today")).toHaveCount(0);
    // clicking a parent path lands on that exact path
    await page.getByTestId("lineage").getByRole("button", { name: "tension:T1 →" }).click();
    await expect(page).toHaveURL(/\/paths\?path=tension%3AT1|\/paths\?path=tension:T1/);
    await expect(page.getByText("Where is reality actually moving?")).toBeVisible({ timeout: 5000 });
  });

  test("Lab opens inside an Innovation with honest lenses and a working prediction-gated Scenario", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/innovations");
    await page.getByRole("button", { name: "Open Lab →" }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Lab — where possibility meets reality")).toBeVisible();
    // honest prototype state
    await page.getByRole("button", { name: "Prototype" }).click();
    await expect(page.getByText("No digital or physical prototype has")).toBeVisible();
    // simulation honesty
    await page.getByRole("button", { name: "Simulation" }).click();
    await expect(page.getByText("scenario arithmetic")).toBeVisible();
    await expect(page.getByText("No Monte Carlo, statistical, or physical simulation")).toBeVisible();
    // scenario requires a stated prediction before running
    await page.getByRole("button", { name: "Scenario" }).click();
    await expect(page.getByRole("button", { name: "Run scenario" })).toBeDisabled();
    await page.getByLabel(/Materiality floor/).fill("3.0");
    await page.getByLabel(/Expected direction/).selectOption("OS-2");
    await page.getByRole("button", { name: "Run scenario" }).click();
    await expect(page.getByText("prediction confirmed")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Whisper-Quiet Night Mode/).first()).toBeVisible();
    // artifacts resolve
    await page.getByRole("button", { name: "Artifacts" }).click();
    await expect(page.getByRole("dialog").getByRole("link", { name: /Innovation Disclosure/ })).toBeVisible();
    await page.getByRole("button", { name: "Close Lab" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("Floor care is a real second category: its own induced evidence per stage, never Air data", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/radar");
    await expect(page.getByText("Reviews retained").first()).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Floor care" }).click();
    // the Radar stage shows Floor Care's OWN machine-induced evidence
    await expect(page.getByTestId("category-stage-radar")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Complaint themes learned from the reviews themselves/)).toBeVisible();
    await expect(page.getByText(/share \(lower bound\)/).first()).toBeVisible();
    await expect(page.getByText(/Real competitor brands \(\d+ with/)).toBeVisible();
    // honestly missing families stay declared missing, not zero-faked or hidden
    await expect(page.getByText(/Honestly missing:/)).toBeVisible();
    await expect(page.getByText("full machine not runnable yet")).toBeVisible({ timeout: 15000 });
    // no Air content leaks under the Floor care label
    await expect(page.getByText("Reviews retained")).toHaveCount(0);
    await expect(page.getByText(/Air Purifier/)).toHaveCount(0);
    // Product universe stage shows the real frozen corpus
    await page.getByRole("navigation", { name: "The machine" }).getByRole("button", { name: /^Product universe$/ }).click();
    await expect(page.getByTestId("category-stage-product_universe")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Frozen validated products")).toBeVisible();
    await expect(page.getByText(/rating_number ≥ 500/)).toBeVisible();
    // Magic stage shows exploratory, never-promoted possibilities
    await page.getByRole("navigation", { name: "The machine" }).getByRole("button", { name: /^Magic box$/ }).click();
    await expect(page.getByTestId("category-stage-magic_box")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/none yet promoted to an innovation/)).toBeVisible();
    await page.getByRole("button", { name: "Back to air purification →" }).click();
    // back on Air, the Magic box world shows Air's own real concepts again
    await expect(page.getByText("what could exist now?")).toBeVisible({ timeout: 5000 });
    expect(errors).toEqual([]);
  });

  test("Criteria is a visible system layer: shell access, Magic box entry, refresh, provenance - never stage 6", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/");
    // the five-stage nav does NOT contain Criteria...
    await expect(page.getByRole("navigation", { name: "The machine" }).getByRole("button", { name: /Criteria/ })).toHaveCount(0);
    // ...but the System group does, from anywhere in the shell
    await page.getByRole("group", { name: "System tools" }).getByRole("button", { name: /Criteria/ }).click();
    await expect(page.getByText("Criteria are not scores. They are tests.")).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/criteria$/);
    // direct refresh keeps the route
    await page.reload();
    await expect(page.getByText("Criteria are not scores. They are tests.")).toBeVisible({ timeout: 5000 });
    await noDocumentScroll(page);
    // a criterion click exposes full rule provenance
    await page.getByRole("button", { name: /Source reality/ }).click();
    await expect(page.getByText("Provenance — where this rule comes from")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Threshold origin:/)).toBeVisible();
    await page.keyboard.press("Escape");
    // Magic box links to the governance layer
    await page.goto("/magic-box");
    await page.getByRole("button", { name: /How concepts are judged/ }).click();
    await expect(page.getByText("Criteria are not scores. They are tests.")).toBeVisible({ timeout: 5000 });
    expect(errors).toEqual([]);
  });

  test("Lab scenario floor is the engine's own live value, not a UI literal", async ({ page }) => {
    await page.goto("/innovations");
    await page.getByRole("button", { name: "Open Lab →" }).first().click();
    await page.getByRole("button", { name: "Scenario" }).click();
    // the floor input carries the runtime value served by the engine
    const floorInput = page.getByLabel(/Materiality floor/);
    await expect(floorInput).toHaveValue("0.5", { timeout: 5000 });
    // prediction options are built from runtime candidates, incl. the honest none-option
    const options = await page.getByLabel(/Expected direction/).locator("option").allTextContents();
    expect(options.some((o) => o.includes("No recommendation"))).toBe(true);
    expect(options.length).toBeGreaterThanOrEqual(4);
    await page.getByRole("button", { name: "Close Lab" }).click();
  });

  test("Radar coverage lens shows the honest source matrix", async ({ page }) => {
    await page.goto("/radar");
    await page.getByRole("button", { name: "Coverage", exact: true }).click();
    await expect(page.getByText("PubMed / PMC")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("not implemented").first()).toBeVisible();
    await expect(page.getByText("snapshot (verified at retrieval)").first()).toBeVisible();
  });

  test("Radar consumer lens shows exact corpus provenance", async ({ page }) => {
    await page.goto("/radar?lens=consumers");
    await expect(page.getByText("Corpus provenance:")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/10,547 reviews normalized → 10,529 retained/)).toBeVisible();
    await expect(page.getByText("Who is missing:")).toBeVisible();
  });

  test("Innovations: decision priority toggle genuinely flips the recommendation", async ({ page }) => {
    await page.goto("/innovations");
    const firstCard = page.getByTitle("Click to trace this bet back to its real evidence").filter({ hasText: "Reliability-Verified Air Purifiers" });
    await expect(firstCard.getByText("Current recommendation", { exact: true })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Economic Value override" }).click();
    await expect(page.getByRole("heading", { name: /Whisper-Quiet Night Mode/ })).toBeVisible({ timeout: 10000 });
    const newCard = page.getByTitle("Click to trace this bet back to its real evidence").filter({ hasText: "Whisper-Quiet Night Mode" });
    await expect(newCard.getByText("Current recommendation", { exact: true })).toBeVisible();
  });

  test("Trace this innovation resolves real evidence, no fabricated links", async ({ page }) => {
    await page.goto("/innovations");
    await page.getByRole("button", { name: "raw" }).click();
    await page.getByRole("button", { name: "Trace this innovation →" }).first().click();
    await expect(page.getByText("Trace this bet — evidence, theme, and every concept built on it")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("No verified link")).toHaveCount(0);
    await expect(page.getByText("◆ Signal").first()).toBeVisible();
  });

  test("Innovations links to Criteria (how the machine decides) without browser Back", async ({ page }) => {
    await page.goto("/innovations");
    await page.getByRole("button", { name: "How the machine decides →" }).click();
    await expect(page.getByText("Criteria are not scores. They are tests.")).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/criteria(\?|$)/);
    await navButton(page, /^Radar$/).click();
    await expect(page).toHaveURL(/\/radar(\?|$)/);
  });

  test("Radar competitors lens shows white space and sends a theme to the Magic box", async ({ page }) => {
    await page.goto("/radar");
    await page.getByRole("button", { name: "Competitors", exact: true }).click();
    await expect(page.getByText("Real competitors analysed")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Send to Magic Box →" }).first().click();
    await expect(page.getByText("what could exist now?")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Filtered from Competitors' white space/)).toBeVisible();
  });

  test("Sources dock reports honest, non-fabricated statuses", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Sources/ }).click();
    await expect(page.getByText("PubMed / PMC")).toBeVisible();
    await expect(page.getByText("not implemented").first()).toBeVisible();
  });

  test("Versuni products header link goes to the catalog served locally on this same origin, same tab", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: "Versuni products" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/verinfo/");
    await expect(link).not.toHaveAttribute("target", "_blank");
    await link.click();
    await expect(page).toHaveURL(/\/verinfo\/?$/);
    await expect(page).toHaveTitle("Versuni Product Universe");
    const backLink = page.getByRole("link", { name: /Innovation Explorer/ });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute("href", "/");
  });

  test("WorldPad footer control steps between the five worlds and returns home", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Evidence in. Better bets out.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Home" })).toHaveText("Home");
    await expect(page.getByRole("button", { name: "Previous world" })).toBeDisabled();

    await page.getByRole("button", { name: "Next world" }).click();
    await expect(page.getByText("what exists today").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Home" })).toHaveText("1/5");

    await page.getByRole("button", { name: "Next world" }).click();
    await expect(page.getByText("what are we observing?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Home" })).toHaveText("2/5");

    await page.getByRole("button", { name: "Home" }).click();
    await expect(page.getByText("Evidence in. Better bets out.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Home" })).toHaveText("Home");
  });

  test("How we got here shows a live, non-empty funnel", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "How we got here" }).click();
    await expect(page.getByText("Real consumer reviews")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("source unavailable")).toHaveCount(0);
  });

  test("Trace this concept resolves signal/tension/assumption evidence, no fabricated links", async ({ page }) => {
    await page.goto("/magic-box");
    await page.locator("text=priority to test (blue border)").waitFor({ timeout: 5000 });
    await page.locator('[role="button"]').filter({ hasText: "$" }).first().click();
    await page.getByRole("button", { name: "Trace this concept →" }).click();
    await expect(page.getByText("Trace this concept — signal, tension, and assumption down to their real papers")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("No verified link")).toHaveCount(0);
    await expect(page.getByText("◆ Signal").first()).toBeVisible();
  });

  test("Criteria page: funnel, Versuni edge, and a criterion are real and clickable", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/criteria");
    await expect(page).toHaveURL(/\/criteria$/);
    await expect(page.getByText("Criteria are not scores. They are tests.")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Versuni edge — diagnostic, not a fourth score")).toBeVisible();
    await page.getByRole("button", { name: "V1 · Portfolio leverage" }).click();
    await expect(page.getByText("NEEDS_EVIDENCE: 16")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("No real Versuni internal-capability dataset").first()).toBeVisible();
    await page.keyboard.press("Escape");
    expect(errors).toEqual([]);
  });

  test("Innovations cards link to a real, readable Innovation Disclosure PDF per candidate", async ({ page, request }) => {
    await page.goto("/innovations");
    const links = page.getByRole("link", { name: /Read the Innovation Disclosure/ });
    await expect(links).toHaveCount(3, { timeout: 5000 });
    for (const id of ["OS-1", "OS-2", "OS-3"]) {
      const link = page.getByRole("link", { name: /Read the Innovation Disclosure/, exact: false }).and(page.locator(`[href="/innovation-disclosures/${id}.pdf"]`));
      await expect(link).toHaveCount(1);
      const res = await request.get(`/innovation-disclosures/${id}.pdf`);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toContain("pdf");
    }
  });

  test("Overview: the five-stage machine is live, clickable, and traced", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Intelligence Machine" })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("● running")).toBeVisible();
    await expect(page.getByText(/snapshot [0-9a-f]{10}/)).toBeVisible();

    for (const label of ["Product universe", "Radar", "Paths", "Magic box", "Innovations"]) {
      await expect(page.locator("main button").filter({ hasText: label }).first()).toBeVisible();
    }

    await page.locator("main button").filter({ hasText: "Radar" }).first().click();
    await expect(page.getByText(/compute_homepage_funnel/)).toHaveCount(0);
    await page.getByRole("button", { name: "▸ source" }).click();
    await expect(page.getByText(/compute_homepage_funnel/)).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByTitle("Paths — click for detail and trace").click();
    await page.getByRole("button", { name: /Formal-case decision brief/ }).click();
    await expect(page.getByText("Wrong if")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Open the per-path field grounding in Paths →" }).click();
    await expect(page.getByText("Where is reality actually moving?")).toBeVisible({ timeout: 5000 });

    await page.getByTitle("Machine overview — home").click();
    await expect(page.getByText("Evidence in. Better bets out.")).toBeVisible({ timeout: 5000 });
    expect(errors).toEqual([]);
  });

  // ---------------- PASS 1: foundation + radar ----------------

  test("Radar defaults to the synthesized Overview lens with honest temporal claim", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/radar");
    await expect(page.getByTestId("radar-distilled-overview")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Reviews retained").first()).toBeVisible();
    await expect(page.getByText("Peer-reviewed papers").first()).toBeVisible();
    // the machine never claims a trend over time from this corpus
    await expect(page.getByText(/no validated time-series exists in this corpus/)).toBeVisible();
    // classifier honesty is on the overview, with the measured coverage gap
    await expect(page.getByText("Classifier honesty:").first()).toBeVisible();
    await expect(page.getByText(/match no theme keyword/).first()).toBeVisible();
    await expect(page.getByText(/92\.74%/).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("every Radar lens has a genuinely different Distilled and Raw view", async ({ page }) => {
    await page.goto("/radar");
    for (const lens of [
      { tab: "Overview", key: "overview" },
      { tab: "Consumer", key: "consumers" },
      { tab: "Research", key: "research" },
      { tab: "Trends", key: "trends" },
      { tab: "Market", key: "market" },
      { tab: "Coverage", key: "sources" },
      { tab: "Competitors", key: "competitors" },
    ]) {
      await page.getByRole("button", { name: lens.tab, exact: true }).click();
      await page.getByRole("button", { name: "distilled", exact: true }).click();
      await expect(page.getByTestId(`radar-distilled-${lens.key}`), `${lens.key} distilled`).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId(`radar-raw-${lens.key}`)).toHaveCount(0);
      await page.getByRole("button", { name: "raw", exact: true }).click();
      await expect(page.getByTestId(`radar-raw-${lens.key}`), `${lens.key} raw`).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId(`radar-distilled-${lens.key}`)).toHaveCount(0);
      // raw is structurally a record table on every table-backed lens
      if (lens.key !== "competitors") {
        await expect(page.getByTestId(`radar-raw-${lens.key}`).locator("table")).toBeVisible();
      }
      await page.getByRole("button", { name: "distilled", exact: true }).click();
    }
  });

  test("public CSAT language is gone: rating gap shown with theme vs corpus means and n", async ({ page }) => {
    await page.goto("/radar?lens=consumers");
    await expect(page.getByText("detected complaint share (lower bound)").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("average rating gap").first()).toBeVisible();
    // open a signal: the method block decomposes the gap honestly
    await page.getByText("average rating gap").first().click();
    await expect(page.getByText("Average rating gap — how it is computed")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Theme mean rating", { exact: true })).toBeVisible();
    await expect(page.getByText("Corpus mean rating", { exact: true })).toBeVisible();
    await expect(page.getByText("n (reviews in theme)")).toBeVisible();
    await page.keyboard.press("Escape");
    // no user-visible "CSAT" anywhere in the five worlds' default views
    for (const path of ["/", "/products", "/radar", "/paths", "/magic-box", "/innovations", "/criteria"]) {
      await page.goto(path);
      await page.waitForTimeout(500);
      const hasCsat = await page.evaluate(() => (document.querySelector("main")?.textContent ?? "").includes("CSAT"));
      expect(hasCsat, `world=${path}`).toBe(false);
    }
  });

  test("deep links: /radar lens/paper params land on the exact object and refresh restores it", async ({ page }) => {
    await page.goto("/radar?lens=research");
    await expect(page.getByTestId("radar-distilled-research")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/All papers \(\d+\)/)).toBeVisible();
    // open a specific paper via param
    await page.goto("/radar?paper=RP-01");
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("dialog").getByText("Does NOT establish")).toBeVisible();
    // the URL keeps the object; a hard refresh restores the same panel
    await page.reload();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("dialog").getByText("Does NOT establish")).toBeVisible();
  });

  test("deep links: market lens and a signal focus survive refresh", async ({ page }) => {
    await page.goto("/radar?lens=market");
    await expect(page.getByText(/Why they disagree/)).toBeVisible({ timeout: 5000 });
    await page.goto("/radar?signal=noise");
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("dialog").getByText("Design consequence")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("dialog").getByText("Design consequence")).toBeVisible({ timeout: 5000 });
  });

  test("deep links: a focused path is in the URL and a refresh restores that exact path", async ({ page }) => {
    await page.goto("/paths");
    await expect(page.getByText("Consequences")).toBeVisible({ timeout: 5000 });
    const rows = page.locator("main button").filter({ hasText: /Tension|Assumption/ });
    await rows.nth(3).click();
    const heading = await page.locator("main h2").first().textContent();
    await expect(page).toHaveURL(/\/paths\?path=/);
    await page.reload();
    await expect(page.getByText("Consequences")).toBeVisible({ timeout: 5000 });
    expect(await page.locator("main h2").first().textContent()).toBe(heading);
  });

  test("deep links: /innovations?lab= opens the Lab directly; innovation param opens the trace", async ({ page }) => {
    await page.goto("/innovations?lab=OS-2");
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Lab — where possibility meets reality")).toBeVisible();
    await page.getByRole("button", { name: "Close Lab" }).click();
    await page.goto("/innovations?innovation=OS-1");
    await expect(page.getByText("Trace this bet — evidence, theme, and every concept built on it")).toBeVisible({ timeout: 15000 });
  });

  test("deep links: a focused official product and criterion survive refresh", async ({ page }) => {
    await page.goto("/products");
    await page.locator("main img").first().waitFor({ timeout: 5000 });
    await page.getByText(/official Versuni|official source/).first().waitFor({ timeout: 5000 });
    // open the first verified official card (clicking its product image
    // bubbles to the card's onClick)
    await page.locator('main img[src^="/products/"]').first().click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/official=/);
    await page.reload();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("dialog").getByText("Specs (official page)")).toBeVisible();
    // criteria: /criteria?criterion=V1 opens the exact rule on its category tab
    await page.goto("/criteria?criterion=V1");
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Provenance — where this rule comes from")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Provenance — where this rule comes from")).toBeVisible({ timeout: 5000 });
  });

  test("homepage funnel families land on their own Radar lenses, dead families stay honest", async ({ page }) => {
    await page.goto("/");
    await page.locator("main button").filter({ hasText: "Radar" }).first().click();
    // clicking the RESEARCH family lands on the Research lens, not the default
    await page.getByRole("button", { name: /RESEARCH →/ }).click();
    await expect(page).toHaveURL(/\/radar\?lens=research/);
    await expect(page.getByTestId("radar-distilled-research")).toBeVisible({ timeout: 5000 });
    // and MARKET lands on Market
    await page.goto("/");
    await page.locator("main button").filter({ hasText: "Radar" }).first().click();
    await page.getByRole("button", { name: /MARKET →/ }).click();
    await expect(page).toHaveURL(/\/radar\?lens=market/);
    await expect(page.getByText(/Why they disagree/)).toBeVisible({ timeout: 5000 });
    // families with no page render without the arrow affordance
    await page.goto("/");
    await page.locator("main button").filter({ hasText: "Radar" }).first().click();
    await expect(page.getByText(/^ECONOMICS$/)).toBeVisible();
    await expect(page.getByRole("button", { name: /ECONOMICS →/ })).toHaveCount(0);
  });

  test("Product universe headline is the verified Versuni portfolio count, never the Amazon corpus", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByRole("heading", { name: /^\d+ verified Versuni products$/ })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("a verified subset checked against official pages")).toBeVisible();
    // the Amazon corpus stays clearly labelled as market context
    await expect(page.getByText(/market context, NOT Versuni's portfolio/)).toBeVisible();
    // the verified portfolio links onward to the full local catalog
    const catalogLink = page.getByTestId("products-verinfo-link");
    await expect(catalogLink).toBeVisible();
    await expect(catalogLink).toHaveAttribute("href", "/verinfo/");
    // homepage tile mirrors the same verified count
    await page.goto("/");
    await expect(page.getByText("verified Versuni products").first()).toBeVisible({ timeout: 5000 });
  });

  // ---------------- PASS 3: innovations as developed possibilities ----------------

  test("Innovations page is the developed-possibility population, formal case clearly separate", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/innovations");
    await expect(page.getByTestId("innovation-population")).toBeVisible({ timeout: 10000 });
    // mechanical states render as sections; no tournament framing over the population
    await expect(page.getByText(/developing · \d+/)).toBeVisible();
    await expect(page.getByText(/challenged · \d+/)).toBeVisible();
    await expect(page.getByText(/rejected · \d+ — killed by the funnel or the Critic/)).toBeVisible();
    // the formal case is a separately-marked lens, never blended
    await expect(page.getByText("Formal case recommendation", { exact: true })).toBeVisible();
    // concept visuals genuinely load (a broken image would leave naturalWidth 0)
    const img = page.locator('img[src*="concept-visuals"]').first();
    await expect(img).toBeVisible();
    await expect.poll(async () => img.evaluate((el: HTMLImageElement) => el.naturalWidth), { timeout: 5000 }).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  test("an Innovation detail answers the 20-second questions and deep-links survive refresh", async ({ page }) => {
    await page.goto("/innovations?innovation=noise:AMBIENT");
    await expect(page.getByTestId("innovation-detail")).toBeVisible({ timeout: 10000 });
    const d = page.getByTestId("innovation-detail");
    await expect(d.getByText("What is it?")).toBeVisible();
    await expect(d.getByText("Why does it exist?")).toBeVisible();
    await expect(d.getByText("How big / heavy / expensive might it be?")).toBeVisible();
    await expect(d.getByText(/unknown — no comparable publishes this/).first()).toBeVisible();
    await expect(d.getByText("What should be tested next?")).toBeVisible();
    // the prototype claim never exceeds what exists
    await expect(page.getByText(/CONCEPT_VISUAL — machine-composed schematic/).first()).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("innovation-detail")).toBeVisible({ timeout: 10000 });
    // lineage is clickable back to the parent path
    await page.getByTestId("innovation-detail").getByRole("button", { name: "tension:T1 →" }).click();
    await expect(page.getByText("Where is reality actually moving?")).toBeVisible({ timeout: 5000 });
  });

  test("full flow: an Innovation walks back through path, field, real reviews, paper, and magic - every step clickable", async ({ page }) => {
    // Innovation -> parent path
    await page.goto("/innovations?innovation=noise:AMBIENT");
    await expect(page.getByTestId("innovation-detail")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("innovation-detail").getByRole("button", { name: "tension:T1 →" }).click();
    await expect(page).toHaveURL(/\/paths\?path=tension/);
    // path -> its field grounding -> the real reviews behind the friction
    await page.getByRole("button", { name: /Ground it in the field/ }).click();
    await page.getByTestId("field-friction").first().click();
    await expect(page.getByRole("dialog").getByText(/CR-\d+/).first()).toBeVisible({ timeout: 5000 });
    await page.keyboard.press("Escape");
    // field -> a supporting paper, landing on the Radar's own record
    await page.getByTestId("path-field").getByRole("button", { name: /RP-\d+ ·/ }).first().click();
    await expect(page).toHaveURL(/\/radar\?.*paper=RP-/);
    await expect(page.getByRole("dialog").getByText("Does NOT establish")).toBeVisible({ timeout: 5000 });
    await page.keyboard.press("Escape");
    // reverse: magic possibility -> back to the same innovation's parent path
    await page.goto("/magic-box?possibility=noise:AMBIENT");
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("lineage")).toBeVisible();
    await page.getByTestId("lineage").getByRole("button", { name: /RP-\d+/ }).first().click();
    await expect(page).toHaveURL(/\/radar\?.*paper=RP-/);
  });

  test("acronyms are expanded where shown: CAGR on Market, CADR/WTP in Products", async ({ page }) => {
    await page.goto("/radar?lens=market");
    await expect(page.getByText(/compound annual growth rate \(CAGR\)/).first()).toBeVisible({ timeout: 5000 });
    await page.goto("/products");
    await page.getByRole("button", { name: "raw" }).click();
    await expect(page.getByText(/clean-air-delivery-rate \(CADR\)/)).toBeVisible({ timeout: 5000 });
  });
});
