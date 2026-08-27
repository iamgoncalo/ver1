import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";

function trackConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
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
      { nav: "RIVALS", heading: "WHERE IS EVERYONE ELSE?" },
      { nav: "COUNTERFACTUALS", heading: "WHAT BECOMES POSSIBLE?" },
      { nav: "INNOVATIONS", heading: "WHAT SHOULD VERSUNI TEST?" },
    ];
    for (const { nav, heading } of expectations) {
      await page.getByRole("button", { name: new RegExp(nav) }).click();
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
    await expect(page.getByText("WHAT BECOMES POSSIBLE?")).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText("WHERE IS EVERYONE ELSE?")).toBeVisible();
    await page.keyboard.press("1");
    await expect(page.getByText("WHAT EXISTS?")).toBeVisible();
  });

  test("DISTILLED/RAW toggle changes content on Products", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("OFFICIAL VERSUNI/PHILIPS")).toBeVisible();
    await page.getByRole("button", { name: "raw" }).click();
    await expect(page.getByText("CONSUMER REVIEW CORPUS")).toBeVisible();
    await expect(page.getByText("OFFICIAL VERSUNI/PHILIPS")).toHaveCount(0);
  });

  test("real official product images load with no broken images", async ({ page }) => {
    await page.goto("/");
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
    await page.getByRole("button", { name: /INNOVATIONS/ }).click();
    await expect(page.getByText("CURRENT WINNER")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("WINNER CHANGED")).toHaveCount(0);
    await page.getByRole("button", { name: "Economic Value override" }).click();
    await expect(page.getByText(/WINNER CHANGED.*baseline OS-1.*now OS-2/)).toBeVisible({ timeout: 10000 });
  });

  test("Trace This Bet resolves real evidence, no fabricated links", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /INNOVATIONS/ }).click();
    await page.getByRole("button", { name: "raw" }).click();
    await page.getByRole("button", { name: "TRACE THIS INNOVATION →" }).first().click();
    await expect(page.getByText("Trace this innovation — reverse to raw evidence")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("NO VERIFIED LINK")).toHaveCount(0);
    await expect(page.getByText("◆ SIGNAL")).toBeVisible();
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
    await page.getByRole("button", { name: /COUNTERFACTUALS/ }).click();
    await page.getByRole("button", { name: /CADR/ }).click();
    await expect(page.getByText("WHAT REAL EVIDENCE BEARS ON IT")).toBeVisible({ timeout: 5000 });
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
    await page.getByRole("button", { name: /PRODUCTS/ }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(errors).toEqual([]);
  });
});
