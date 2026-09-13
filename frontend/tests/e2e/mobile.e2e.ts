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

  test("Shorthand input is tappable on mobile (min height 44px)", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("start-session-button").click();
    await page.waitForURL(/\/session\/\d+/);

    const input = page.getByTestId("shorthand-input").first();
    await expect(input).toBeVisible({ timeout: 5000 });
    const box = await input.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test("User can log an exercise on mobile viewport", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("start-session-button").click();
    await page.waitForURL(/\/session\/\d+/);

    await expect(page.locator('[data-testid^="exercise-card-"]').first()).toBeVisible();

    const input = page.getByTestId("shorthand-input").first();
    await input.click();
    await input.fill("20x12x3");

    await expect(page.getByTestId("shorthand-preview").first()).toBeVisible();
    await page.getByText("LOG EXERCISE").first().click();
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
