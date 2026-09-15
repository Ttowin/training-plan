import { test, expect } from "@playwright/test";

/**
 * Mobile viewport tests — verifies the app is usable on small screens.
 * These tests run under the "mobile-chrome" project (Pixel 7 viewport).
 */

test.describe("Mobile viewport — Pixel 7 (412×915)", () => {
  test("Dashboard loads correctly without horizontal overflow", async ({ page }) => {
    await page.goto("/");
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width ?? 412;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // 5px tolerance
  });

  test("Start session button is tappable (min height 44px)", async ({ page }) => {
    await page.goto("/");
    const btn = page.getByTestId("start-session-button");
    await expect(btn).toBeVisible({ timeout: 5000 });
    const box = await btn.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test("Log-sets button is tappable on mobile (min height 44px)", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("start-session-button").click();
    await page.waitForURL(/\/session\/\d+/);

    const logBtn = page.locator('[data-testid^="log-sets-"]').first();
    await expect(logBtn).toBeVisible({ timeout: 10000 });
    const box = await logBtn.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test("User can log sets on mobile viewport", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("start-session-button").click();
    await page.waitForURL(/\/session\/\d+/);

    const firstCard = page.locator('[data-testid^="exercise-card-"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    // Adjust reps on the first set, then log
    await firstCard.getByLabel("set 1 increase reps").click();
    await firstCard.locator('[data-testid^="log-sets-"]').click();

    await expect(firstCard.locator('[data-testid^="logged-summary-"]')).toBeVisible({ timeout: 5000 });
  });

  test("Navigation bar is visible and usable on mobile", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("HOME")).toBeVisible();
    await expect(page.getByText("LOG")).toBeVisible();
    await expect(page.getByText("DATA")).toBeVisible();

    // Navigate to history
    await page.getByText("LOG").click();
    await expect(page).toHaveURL("/history");
  });
});
