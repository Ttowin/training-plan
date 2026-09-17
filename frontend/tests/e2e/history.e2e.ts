import { test, expect } from "@playwright/test";

/**
 * Session history management — delete sessions and edit completed session data.
 */

test.describe("Session history management", () => {
  test("User can open a completed session and edit logged sets", async ({ page }) => {
    // Start and complete a session with one logged exercise
    await page.goto("/");
    await page.getByTestId("start-session-button").click();
    await page.waitForURL(/\/session\/\d+/);

    const firstRow = page.locator('button[data-testid^="exercise-overview-"]').first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await firstRow.click();

    const card = page.locator('[data-testid^="exercise-card-"]');
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.getByLabel("set 1 increase weight").click();
    await card.locator('[data-testid^="log-sets-"]').click();
    await expect(card.locator('[data-testid^="logged-summary-"]')).toBeVisible({ timeout: 5000 });

    await page.getByTestId("overview-back").click();

    // Complete the session
    await page.getByTestId("complete-session-button").click();
    await page.getByTestId("confirm-complete-button").click();
    await expect(page).toHaveURL("/history", { timeout: 5000 });

    // Re-open from history
    const sessionCard = page.locator('[data-testid^="session-card-"]').first();
    await expect(sessionCard).toBeVisible();
    await sessionCard.locator("button").first().click();
    await page.waitForURL(/\/session\/\d+/);

    // Editing banner and overview should appear
    await expect(page.getByTestId("editing-past-session-banner")).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[data-testid^="exercise-overview-"]').first()).toBeVisible();

    // Update logged sets
    await page.locator('button[data-testid^="exercise-overview-"]').first().click();
    await expect(page.getByTestId("editing-past-session-banner")).toBeVisible();
    await card.getByLabel("set 1 increase reps").click();
    await card.locator('[data-testid^="log-sets-"]').click();
    await expect(card.locator('[data-testid^="logged-summary-"]')).toContainText("logged", { timeout: 5000 });
  });

  test("User can delete a session from history", async ({ page }) => {
    // Create a quick session
    await page.goto("/");
    await page.getByTestId("start-session-button").click();
    await page.waitForURL(/\/session\/\d+/);

    await page.getByTestId("complete-session-button").click();
    await page.getByTestId("confirm-complete-button").click();
    await expect(page).toHaveURL("/history", { timeout: 5000 });

    const sessionCard = page.locator('[data-testid^="session-card-"]').first();
    await expect(sessionCard).toBeVisible();
    const sessionTestId = await sessionCard.getAttribute("data-testid");
    expect(sessionTestId).toBeTruthy();

    const deleteBtn = sessionCard.locator('[data-testid^="delete-session-"]');
    await deleteBtn.click();

    const confirmBtn = sessionCard.locator('[data-testid^="confirm-delete-session-"]');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    await expect(page.locator(`[data-testid="${sessionTestId}"]`)).not.toBeVisible({ timeout: 5000 });
  });

  test("User can discard an active session", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("start-session-button").click();
    await page.waitForURL(/\/session\/\d+/);

    await page.getByTestId("delete-session-button").click();
    await page.getByTestId("confirm-delete-session-button").click();

    await expect(page).toHaveURL("/history", { timeout: 5000 });
  });
});
