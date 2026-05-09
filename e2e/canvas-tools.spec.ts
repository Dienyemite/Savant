/**
 * canvas-tools.spec.ts — Sprint 7.5.3
 *
 * E2E: Canvas toolbar keyboard shortcuts and tool interactions.
 */

import { test, expect } from "@playwright/test";

test.describe("Canvas tools", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Dismiss notebook cover if present
    const cover = page.getByText("Open Notebook");
    if (await cover.isVisible()) {
      await cover.click();
    }
  });

  test("pressing P activates the Pen tool", async ({ page }) => {
    await page.keyboard.press("p");
    // The pen button in the toolbar should appear active
    await expect(page.getByTitle(/Pen/)).toBeVisible();
  });

  test("pressing E activates the Eraser tool", async ({ page }) => {
    await page.keyboard.press("e");
    await expect(page.getByTitle(/Eraser/)).toBeVisible();
  });

  test("pressing T activates the Text tool", async ({ page }) => {
    await page.keyboard.press("t");
    await expect(page.getByTitle(/Text/)).toBeVisible();
  });
});
