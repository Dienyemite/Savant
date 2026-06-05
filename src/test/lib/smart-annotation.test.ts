/**
 * smart-annotation.test.ts
 *
 * Tests for buildAnnotationPrompt — verifies that the covered text,
 * concept title, and slide index are injected correctly, and that the
 * professor-margin-note rules are present in the output.
 */

import { describe, it, expect } from "vitest";
import { buildAnnotationPrompt, type AnnotationContext } from "@/lib/smart-annotation";

const BASE_CTX: AnnotationContext = {
  coveredText: "The rate of change of momentum equals the net applied force.",
  conceptTitle: "Newton's Second Law",
  slideIndex: 3,
};

describe("buildAnnotationPrompt", () => {
  it("includes the highlighted passage in the output", () => {
    const prompt = buildAnnotationPrompt(BASE_CTX);
    expect(prompt).toContain(
      "The rate of change of momentum equals the net applied force."
    );
  });

  it("includes the concept title", () => {
    const prompt = buildAnnotationPrompt(BASE_CTX);
    expect(prompt).toContain("Newton's Second Law");
  });

  it("reports slide number as 1-based index", () => {
    const prompt = buildAnnotationPrompt(BASE_CTX);
    // slideIndex 3 → "Slide: 4"
    expect(prompt).toContain("Slide: 4");
  });

  it("contains the rule prohibiting summarisation", () => {
    const prompt = buildAnnotationPrompt(BASE_CTX);
    expect(prompt).toContain("Do NOT summarise");
  });

  it("contains the 1–2 sentence length rule", () => {
    const prompt = buildAnnotationPrompt(BASE_CTX);
    expect(prompt).toContain("1–2 sentences");
  });

  it("contains the rule prohibiting first-person 'I'", () => {
    const prompt = buildAnnotationPrompt(BASE_CTX);
    expect(prompt).toContain("Do NOT use first-person");
  });

  it("handles slide index 0 (first slide)", () => {
    const prompt = buildAnnotationPrompt({ ...BASE_CTX, slideIndex: 0 });
    expect(prompt).toContain("Slide: 1");
  });
});
