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
      { nav: /^Paths$/, heading: "Where does reality appear to be moving?" },
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
    await expect(page.getByText("Where does reality appear to be moving?")).toBeVisible();
    await page.keyboard.press("0");
    await expect(page.getByText("Evidence in. Better bets out.")).toBeVisible();
  });

  test("every world has a working deep link and browser Back is never required", async ({ page }) => {
    for (const [path, marker] of [
      ["/products", "what exists today"],
      ["/radar", "what are we observing?"],
      ["/paths", "Where does reality appear to be moving?"],
      ["/magic-box", "what could exist now?"],
      ["/innovations", "which possibilities are becoming serious?"],
      ["/criteria", "how the machine decides"],
      // legacy routes fold into their canonical worlds
      ["/field", "Where does reality appear to be moving?"],
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

  test("Paths world: real trajectories with consequences and falsifiers; no placeholder rows; inspector opens in-world", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/paths");
    await expect(page.getByText(/\d+ paths, each labelled by its evidence maturity/)).toBeVisible({ timeout: 5000 });
    // every trajectory carries a computed maturity label; none claims verified causal drivers
    await expect(page.getByText("challenged").first()).toBeVisible();
    await expect(page.getByText(/No verified causal driver behind this trajectory/)).toBeVisible();
    await expect(page.getByText("Consequences")).toBeVisible();
    await expect(page.getByText(/Closes \/ would falsify/).first()).toBeVisible();
    // fields with no verified evidence are absent, never placeholder rows
    await expect(page.getByText(/NO VERIFIED DATA/)).toHaveCount(0);
    await expect(page.getByText(/not established — no verified/)).toHaveCount(0);
    // selecting another trajectory swaps the inspector without navigation
    const rows = page.locator("main button").filter({ hasText: /Tension|Assumption/ });
    await rows.nth(2).click();
    await expect(page.getByText("Consequences")).toBeVisible();
    await expect(page).toHaveURL(/\/paths$/);
    // Field is nested inside Paths - grounding opens in place, no route change
    await page.getByRole("button", { name: /Ground it in the field/ }).click();
    await expect(page.getByText("Field — what THIS trajectory means in the real world")).toBeVisible();
    await expect(page).toHaveURL(/\/paths$/);
    // regression: "Radar evidence" navigates to Radar, never Product universe
    await page.getByRole("button", { name: "← Radar evidence" }).click();
    await expect(page).toHaveURL(/\/radar$/);
    await expect(page.getByText("what are we observing?")).toBeVisible({ timeout: 5000 });
    await noDocumentScroll(page);
    expect(errors).toEqual([]);
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

  test("category is a real computation input: Floor care shows its honest live eligibility, never Air data", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/radar");
    await expect(page.getByText("Corpus provenance:")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Floor care" }).click();
    await expect(page.getByText("insufficient evidence")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Eligible evidence, by family")).toBeVisible();
    // genuinely zero eligible evidence for floor care - live computation, not
    // authored: at least four families render a literal 0 count
    await expect(page.getByText("reviews", { exact: true })).toBeVisible();
    expect(await page.getByText(/^0$/).count()).toBeGreaterThanOrEqual(4);
    // no Air content is shown under the Floor care label
    await expect(page.getByText("Corpus provenance:")).toHaveCount(0);
    await page.getByRole("button", { name: "Back to air purification →" }).click();
    await expect(page.getByText("Corpus provenance:")).toBeVisible({ timeout: 5000 });
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
    await page.getByRole("button", { name: "Coverage" }).click();
    await expect(page.getByText("PubMed / PMC")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("not implemented").first()).toBeVisible();
    await expect(page.getByText("snapshot (verified at retrieval)").first()).toBeVisible();
  });

  test("Radar consumer lens shows exact corpus provenance", async ({ page }) => {
    await page.goto("/radar");
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
    await expect(page).toHaveURL(/\/criteria$/);
    await navButton(page, /^Radar$/).click();
    await expect(page).toHaveURL(/\/radar$/);
  });

  test("Radar competitors lens shows white space and sends a theme to the Magic box", async ({ page }) => {
    await page.goto("/radar");
    await page.getByRole("button", { name: "Competitors" }).click();
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
    await page.getByRole("button", { name: /Field brief/ }).click();
    await expect(page.getByText("Wrong if")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Ground it inside Paths →" }).click();
    await expect(page.getByText("Where does reality appear to be moving?")).toBeVisible({ timeout: 5000 });

    await page.getByTitle("Machine overview — home").click();
    await expect(page.getByText("Evidence in. Better bets out.")).toBeVisible({ timeout: 5000 });
    expect(errors).toEqual([]);
  });
});
