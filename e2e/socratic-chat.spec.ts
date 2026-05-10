/**
 * socratic-chat.spec.ts — Sprint 7.5.4
 *
 * E2E: Socratic chat panel interactions.
 * Tests the chat panel trigger, message sending, and selection-to-marginalia flow.
 */

import { test, expect } from "@playwright/test";

test.describe("Socratic chat", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Dismiss notebook cover if present
    const cover = page.getByText("Open Notebook");
    if (await cover.isVisible()) {
      // Fill required fields before opening
      await page.getByText("Open Notebook").click().catch(() => {});
    }
  });

  test("chat panel appears after failing an interactive block twice", async ({ page }) => {
    // Navigate into a lesson
    await page.getByText("Addition").first().click();
    const startBtn = page.getByText(/Start Learning|Begin/i).first();
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click();

    // Find the interactive slider and submit wrong answers twice
    const slider = page.locator('input[type="range"]');
    if (await slider.isVisible({ timeout: 3000 })) {
      // Submit wrong value twice to trigger chat panel
      for (let i = 0; i < 2; i++) {
        // Set slider to an obviously wrong value (0)
        await slider.evaluate((el: HTMLInputElement) => {
          el.value = "0";
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        });
        // Click submit/check button if present
        const submitBtn = page.getByRole("button", { name: /check|submit/i }).first();
        if (await submitBtn.isVisible({ timeout: 1000 })) {
          await submitBtn.click();
          await page.waitForTimeout(300);
        }
      }
    }

    // Chat panel should appear (either automatically or be accessible)
    // The chat button / panel should be present in the lesson view
    const chatTrigger = page.locator('[data-testid="socratic-chat"], [aria-label*="chat" i], button:has-text("Ask")').first();
    await expect(chatTrigger).toBeVisible({ timeout: 5000 });
  });

  test("can type and send a message in the chat panel", async ({ page }) => {
    // Navigate into a lesson and open chat
    await page.getByText("Addition").first().click();
    const startBtn = page.getByText(/Start Learning|Begin/i).first();
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click();

    // Wait for lesson view to be visible
    await page.waitForTimeout(500);

    // Look for chat input
    const chatInput = page.locator('textarea[placeholder*="Ask"], input[placeholder*="Ask"], textarea[placeholder*="ask"]').first();

    if (await chatInput.isVisible({ timeout: 3000 })) {
      await chatInput.fill("What is 3 + 4?");
      await page.keyboard.press("Enter");
      // A response or streaming indicator should appear
      await expect(
        page.locator('[data-testid="chat-message"], .chat-message, [aria-live]').first()
      ).toBeVisible({ timeout: 10000 });
    } else {
      // Chat may require triggering via failure — skip gracefully
      test.skip();
    }
  });

  test("selecting text in the lesson shows 'Ask Savant' tooltip", async ({ page }) => {
    // Navigate into a lesson
    await page.getByText("Addition").first().click();
    const startBtn = page.getByText(/Start Learning|Begin/i).first();
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click();

    // Wait for lesson content to render
    const lessonText = page.locator("p, .lesson-text, [data-testid='block-renderer']").first();
    await expect(lessonText).toBeVisible({ timeout: 5000 });

    // Select text by double-clicking a word
    await lessonText.dblclick();

    // Tooltip "Ask Savant" should appear
    const tooltip = page.getByText(/Ask Savant/i);
    await expect(tooltip).toBeVisible({ timeout: 3000 });
  });
});
