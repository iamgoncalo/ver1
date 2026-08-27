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
      { nav: "SIGNALS", heading: "WHAT IS CHANGING?" },
      { nav: "COMPETITORS", heading: "WHERE IS EVERYONE ELSE?" },
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
    await expect(page.getByText("WHERE IS EVERYONE ELSE?")).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText("HOW INTELLIGENCE DECIDES")).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText("WHERE IS EVERYONE ELSE?")).toBeVisible();
    await page.keyboard.press("1");
    await expect(page.getByText("WHAT EXISTS?")).toBeVisible();
  });

  test("DISTILLED/RAW toggle changes content on Products", async ({ page }) => {
    await page.goto("/");
    await navButton(page, /PRODUCTS/).click();
    await expect(page.getByText("OFFICIAL VERSUNI/PHILIPS")).toBeVisible();
    await page.getByRole("button", { name: "raw" }).click();
    await expect(page.getByText("CONSUMER REVIEW CORPUS")).toBeVisible();
    await expect(page.getByText("OFFICIAL VERSUNI/PHILIPS")).toHaveCount(0);
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
    await navButton(page, /CRITERIA/).click();
    await page.getByRole("button", { name: /CADR/ }).click();
    await expect(page.getByText("WHAT REAL EVIDENCE BEARS ON IT")).toBeVisible({ timeout: 5000 });
  });

  test("Trace This Concept resolves signal/tension/assumption evidence, no fabricated links", async ({ page }) => {
    await page.goto("/");
    await navButton(page, /CRITERIA/).click();
    await page.locator("text=Finalists —").waitFor({ timeout: 5000 });
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

  test("Innovation Funnel homepage: machine state, stages, and patterns are real and traced", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/");
    await expect(page.getByText("Innovation Funnel")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("● RUNNING")).toBeVisible();
    await expect(page.getByText(/SNAPSHOT [0-9a-f]{10}/)).toBeVisible();

    // A stage box shows a real count and, on click, a real file trace.
    const productsBox = page.locator("main button").filter({ hasText: "PRODUCTS" }).first();
    await expect(productsBox).toBeVisible();
    await productsBox.click();
    await expect(page.getByText(/products_real\.json/)).toBeVisible({ timeout: 5000 });
    await page.keyboard.press("Escape");

    // A pattern type (e.g. ANOMALY, currently real-but-empty) is honest, not padded.
    const anomalyBox = page.locator('button[title="one product/behaviour is surprisingly different"]');
    await anomalyBox.click();
    await expect(page.getByText(/defect_detection_report_real\.json/)).toBeVisible({ timeout: 5000 });
    await page.keyboard.press("Escape");

    // Logo returns home from a deep page.
    await navButton(page, /CRITERIA/).click();
    await expect(page.getByText("How Intelligence Decides")).toBeVisible({ timeout: 5000 });
    await page.getByTitle("Innovation Funnel — home").click();
    await expect(page.getByText("Evidence in. Better bets out.")).toBeVisible({ timeout: 5000 });

    expect(errors).toEqual([]);
  });
});
