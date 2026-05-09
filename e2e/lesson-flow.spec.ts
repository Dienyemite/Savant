/**
 * lesson-flow.spec.ts — Sprint 7.5.2
 *
 * E2E: Lesson node click → lesson modal → lesson view → mastery.
 */

import { test, expect } from "@playwright/test";

test.describe("Lesson flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Dismiss notebook cover if present
    const cover = page.getByText("Open Notebook");
    if (await cover.isVisible()) {
      await cover.click();
    }
  });

  test("clicking an unlocked node opens the concept info panel", async ({ page }) => {
    // Click the Addition node (always unlocked in demo seed)
    await page.getByText("Addition").first().click();
    await expect(page.getByText(/Start Learning|Begin/i)).toBeVisible({ timeout: 5000 });
  });
});
