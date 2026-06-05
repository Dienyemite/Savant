/**
 * socratic-prompt.test.ts
 *
 * Tests for buildSocraticSystemPrompt — verifies that lesson context is
 * correctly injected into the output and that the absolute rules are present.
 */

import { describe, it, expect } from "vitest";
import { buildSocraticSystemPrompt, type LessonContext } from "@/lib/socratic-prompt";

const BASE_CTX: LessonContext = {
  lessonTitle: "Newton's Second Law",
  lessonDescription: "Understanding F = ma",
  conceptTitle: "Force & Motion",
  conceptDomain: "science",
  currentBlockType: "multiple_choice",
  currentBlockContent: { question: "What happens when force doubles?" },
  studentAnswer: "A",
  attemptCount: 1,
  slideIndex: 2,
  totalSlides: 8,
  lessonProgress: 0.375,
};

describe("buildSocraticSystemPrompt", () => {
  it("includes the lesson title in the output", () => {
    const prompt = buildSocraticSystemPrompt(BASE_CTX);
    expect(prompt).toContain("Newton's Second Law");
  });

  it("includes the concept domain and title", () => {
    const prompt = buildSocraticSystemPrompt(BASE_CTX);
    expect(prompt).toContain("science");
    expect(prompt).toContain("Force & Motion");
  });

  it("reports slide number as 1-based index", () => {
    const prompt = buildSocraticSystemPrompt(BASE_CTX);
    // slideIndex 2 → "3 of 8"
    expect(prompt).toContain("3 of 8");
  });

  it("rounds progress to nearest percent", () => {
    const prompt = buildSocraticSystemPrompt(BASE_CTX);
    // 0.375 → 38%
    expect(prompt).toContain("38%");
  });

  it("includes the attempt count", () => {
    const prompt = buildSocraticSystemPrompt(BASE_CTX);
    expect(prompt).toContain("1");
  });

  it("serialises currentBlockContent as JSON", () => {
    const prompt = buildSocraticSystemPrompt(BASE_CTX);
    expect(prompt).toContain("What happens when force doubles?");
  });

  it("serialises studentAnswer", () => {
    const prompt = buildSocraticSystemPrompt(BASE_CTX);
    expect(prompt).toContain('"A"');
  });

  it("contains the absolute rule prohibiting direct answers", () => {
    const prompt = buildSocraticSystemPrompt(BASE_CTX);
    expect(prompt).toContain("NEVER provide the final answer");
  });

  it("handles zero attempts", () => {
    const prompt = buildSocraticSystemPrompt({ ...BASE_CTX, attemptCount: 0 });
    expect(prompt).toContain("0");
  });

  it("handles 100% progress", () => {
    const prompt = buildSocraticSystemPrompt({
      ...BASE_CTX,
      lessonProgress: 1,
      slideIndex: 7,
    });
    expect(prompt).toContain("100%");
    expect(prompt).toContain("8 of 8");
  });
});
