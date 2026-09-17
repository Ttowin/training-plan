import { test, expect, type Page } from "@playwright/test";

/**
 * Full training day workflow simulation — Chest & Shoulder Day
 * Tests the end-to-end user journey from dashboard to session completion.
 */

async function resetDatabase(page: Page) {
  // Seed via API — this requires a test-only reset endpoint
  // In CI, the D1 DB is fresh. Locally we rely on wrangler dev with --local
  await page.request.delete("/api/test/reset").catch(() => {
    // Endpoint may not exist; silently continue
  });
}

test.describe("Full training day workflow — Chest & Shoulder Day", () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase(page);
  });

  test("User sees today's training day on dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("current-day-name")).toBeVisible({ timeout: 5000 });
    // First ever visit should show Chest & Shoulder Day (Day 1)
    const dayName = await page.getByTestId("current-day-name").textContent();
    expect(dayName).toBeTruthy();
  });

  test("User starts a session and is navigated to active session page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("start-session-button")).toBeVisible();
    await page.getByTestId("start-session-button").click();
    await expect(page).toHaveURL(/\/session\/\d+/, { timeout: 5000 });
  });

  test("Active session overview shows plan exercises without duplicates", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("start-session-button").click();
    await page.waitForURL(/\/session\/\d+/);

    const rows = page.locator('button[data-testid^="exercise-overview-"]');
    await expect(rows.first()).toBeVisible({ timeout: 5000 });
    await expect(rows).toHaveCount(5);

    const names = await page
      .locator('button[data-testid^="exercise-overview-"] > div.flex-1 > div.font-terminal.text-sm')
      .allTextContents();
    expect(new Set(names).size).toBe(names.length);
  });

  test("Session page survives browser refresh", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("start-session-button").click();
    await page.waitForURL(/\/session\/\d+/);

    await expect(page.locator('button[data-testid^="exercise-overview-"]').first()).toBeVisible();
    const sessionUrl = page.url();

    await page.reload();
    await expect(page).toHaveURL(sessionUrl, { timeout: 5000 });
    await expect(page.locator('button[data-testid^="exercise-overview-"]').first()).toBeVisible({ timeout: 5000 });
  });

  test("User opens an exercise and logs its sets", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("start-session-button").click();
    await page.waitForURL(/\/session\/\d+/);

    // Open the first exercise from the overview
    const firstRow = page.locator('button[data-testid^="exercise-overview-"]').first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await firstRow.click();

    // Detail card renders (after last-session data is fetched)
    const card = page.locator('[data-testid^="exercise-card-"]');
    await expect(card).toBeVisible({ timeout: 10000 });

    // Set rows are prefilled; bump the first set's weight, then log
    await card.getByLabel("set 1 increase weight").click();
    await card.locator('[data-testid^="log-sets-"]').click();

    const summary = card.locator('[data-testid^="logged-summary-"]');
    await expect(summary).toBeVisible({ timeout: 5000 });
    await expect(summary).toContainText("logged");

    // Back to overview shows the exercise as logged
    await page.getByTestId("overview-back").click();
    await expect(page.locator('button[data-testid^="exercise-overview-"]').first()).toContainText("set");
  });

  test("User adds an ad-hoc exercise not in the plan", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("start-session-button").click();
    await page.waitForURL(/\/session\/\d+/);

    await expect(page.getByTestId("add-exercise-button")).toBeVisible();
    await page.getByTestId("add-exercise-button").click();

    // Modal should appear
    const modal = page.getByTestId("add-exercise-modal");
    await expect(modal).toBeVisible();

    // Fill exercise name
    await modal.getByTestId("add-exercise-name-input").fill("Cable Crossover");

    // Fill shorthand (scoped to modal to avoid matching exercise card inputs)
    await modal.getByTestId("shorthand-input").fill("12x15x3");

    // Submit
    await modal.getByTestId("add-exercise-submit").click();

    // Ad-hoc exercise should appear in session
    await expect(page.getByText("Cable Crossover")).toBeVisible({ timeout: 3000 });
  });

  test("User completes session via confirmation flow", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("start-session-button").click();
    await page.waitForURL(/\/session\/\d+/);

    await expect(page.getByTestId("complete-session-button")).toBeVisible();
    await page.getByTestId("complete-session-button").click();

    // Confirmation dialog appears
    await expect(page.getByTestId("confirm-complete-button")).toBeVisible();
    await page.getByTestId("confirm-complete-button").click();

    // Redirects to history
    await expect(page).toHaveURL("/history", { timeout: 5000 });
  });
});
