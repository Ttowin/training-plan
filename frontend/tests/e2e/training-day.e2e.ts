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

  test("User logs an exercise with shorthand input", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("start-session-button").click();
    await page.waitForURL(/\/session\/\d+/);

    // Wait for plan to load
    await expect(page.locator('[data-testid^="exercise-card-"]').first()).toBeVisible();

    // Type into first shorthand input
    const firstInput = page.getByTestId("shorthand-input").first();
    await firstInput.fill("15x12x3");

    // Preview should appear
    const preview = page.getByTestId("shorthand-preview").first();
    await expect(preview).toBeVisible();
    await expect(preview).toContainText("15kg");

    // Click log button
    await page.getByText("LOG EXERCISE").first().click();

    // Input should clear after logging
    await expect(firstInput).toHaveValue("", { timeout: 3000 });
  });

  test("User adds an ad-hoc exercise not in the plan", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("start-session-button").click();
    await page.waitForURL(/\/session\/\d+/);

    await expect(page.getByTestId("add-exercise-button")).toBeVisible();
    await page.getByTestId("add-exercise-button").click();

    // Modal should appear
    await expect(page.getByTestId("add-exercise-modal")).toBeVisible();

    // Fill exercise name
    await page.getByTestId("add-exercise-name-input").fill("Cable Crossover");

    // Fill shorthand
    await page.getByTestId("shorthand-input").fill("12x15x3");

    // Submit
    await page.getByTestId("add-exercise-submit").click();

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
