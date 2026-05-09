/**
 * onboarding.spec.ts — Sprint 7.5.1
 *
 * E2E: Onboarding flow — redirect, path selection, cover dismiss.
 */

import { test, expect } from "@playwright/test";

test.describe("Onboarding flow", () => {
  test("unauthenticated user on / sees the notebook cover", async ({ page }) => {
    await page.goto("/");
    // NotebookCover should be visible on first load
    await expect(page.getByText("Open Notebook")).toBeVisible({ timeout: 5000 });
  });

  test("clicking 'Open Notebook' dismisses the cover", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Open Notebook").click();
    // After dismiss, the knowledge graph canvas should be visible
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 5000 });
  });

  test("navigating to /onboarding renders the onboarding page", async ({ page }) => {
    await page.goto("/onboarding");
    // Onboarding page has a path selection
    await expect(page.getByText(/Self-Learning|Guided/i)).toBeVisible({ timeout: 5000 });
  });
});
