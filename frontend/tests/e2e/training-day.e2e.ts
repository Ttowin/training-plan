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

  test("Active session page shows plan exercises", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("start-session-button").click();
    await page.waitForURL(/\/session\/\d+/);

    // Plan exercises should be visible
    const exerciseCards = page.locator('[data-testid^="exercise-card-"]');
    await expect(exerciseCards.first()).toBeVisible({ timeout: 5000 });
    const count = await exerciseCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("User logs sets with the set-by-set logger", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("start-session-button").click();
    await page.waitForURL(/\/session\/\d+/);

    // Wait for plan cards (they render after last-session data is fetched)
    const firstCard = page.locator('[data-testid^="exercise-card-"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    // Set rows are prefilled; bump the first set's weight
    await firstCard.getByLabel("set 1 increase weight").click();

    // Log the sets
    await firstCard.locator('[data-testid^="log-sets-"]').click();

    // A logged summary should appear on the card
    const summary = firstCard.locator('[data-testid^="logged-summary-"]');
    await expect(summary).toBeVisible({ timeout: 5000 });
    await expect(summary).toContainText("logged");
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
