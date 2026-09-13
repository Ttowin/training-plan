import { test, expect } from "@playwright/test";

/**
 * Training day cycle selector tests.
 * Tests the ability to override the automatically detected training day.
 */

test.describe("Training day cycle selector", () => {
  test("User can see cycle selector toggle on dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("cycle-selector-toggle")).toBeVisible({ timeout: 5000 });
  });

  test("Clicking CHANGE reveals the cycle selector", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("cycle-selector-toggle").click();
    await expect(page.getByTestId("cycle-selector")).toBeVisible();
  });

  test("User overrides training day by clicking a different day", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("cycle-selector-toggle").click();

    const selector = page.getByTestId("cycle-selector");
    await expect(selector).toBeVisible();

    // Click Leg Day option
    await page.getByTestId("cycle-option-4").click();

    // Dashboard should now show Leg Day
    await expect(page.getByTestId("current-day-name")).toContainText("Leg Day", { timeout: 3000 });
  });

  test("Overridden day is reflected when starting session", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("cycle-selector-toggle").click();

    // Select Back Day
    await page.getByTestId("cycle-option-2").click();

    // Start session
    await page.getByTestId("start-session-button").click();
    await page.waitForURL(/\/session\/\d+/);

    // Session page header should reflect Back Day exercises
    await expect(page.locator("text=Back Day")).toBeVisible({ timeout: 5000 });
  });
});
