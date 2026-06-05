/**
 * teacher-prompt.test.ts
 *
 * Tests for buildTeacherSystemPrompt — verifies subject routing, level
 * guidance, learning mode guidance, and textbook context injection.
 * All tests exercise the public interface only; no mocks needed.
 */

import { describe, it, expect } from "vitest";
import { buildTeacherSystemPrompt, type TeacherContext } from "@/lib/teacher-prompt";

const BASE_CTX: TeacherContext = {
  topic: "Projectile Motion",
  subject: "physics",
  learning_mode: "k12",
  textbook_context: "Projectile motion is motion in two dimensions under gravity alone.",
  diagnostic_result: null,
};

// ── Subject routing ───────────────────────────────────────────────────────────

describe("buildTeacherSystemPrompt — subject routing", () => {
  it("requires playground and step_trace for physics", () => {
    const prompt = buildTeacherSystemPrompt(BASE_CTX);
    expect(prompt).toContain("playground");
    expect(prompt).toContain("step_trace");
    expect(prompt).toContain("worked_example");
    expect(prompt).toContain("sketch");
  });

  it("requires playground and step_trace for chemistry", () => {
    const prompt = buildTeacherSystemPrompt({ ...BASE_CTX, subject: "chemistry" });
    expect(prompt).toContain("playground");
    expect(prompt).toContain("step_trace");
  });

  it("requires step_trace and formula_builder for math", () => {
    const prompt = buildTeacherSystemPrompt({ ...BASE_CTX, subject: "math" });
    expect(prompt).toContain("step_trace");
    expect(prompt).toContain("formula_builder");
    expect(prompt).toContain("function_plot");
  });

  it("requires quote_analysis and key_terms for literature", () => {
    const prompt = buildTeacherSystemPrompt({ ...BASE_CTX, subject: "english literature" });
    expect(prompt).toContain("quote_analysis");
    expect(prompt).toContain("key_terms");
  });

  it("prohibits playground for literature", () => {
    const prompt = buildTeacherSystemPrompt({ ...BASE_CTX, subject: "literature" });
    expect(prompt).toContain("Do NOT include");
    expect(prompt).toMatch(/Do NOT include.*playground/);
  });

  it("requires timeline for history", () => {
    const prompt = buildTeacherSystemPrompt({ ...BASE_CTX, subject: "history" });
    expect(prompt).toContain("timeline");
    expect(prompt).toContain("key_terms");
  });

  it("requires step_trace and worked_example for cs", () => {
    const prompt = buildTeacherSystemPrompt({ ...BASE_CTX, subject: "computer science" });
    expect(prompt).toContain("step_trace");
    expect(prompt).toContain("worked_example");
  });

  it("requires analogy and key_terms for unknown subjects", () => {
    const prompt = buildTeacherSystemPrompt({ ...BASE_CTX, subject: "cooking" });
    expect(prompt).toContain("analogy");
    expect(prompt).toContain("key_terms");
  });
});

// ── Learning mode guidance ────────────────────────────────────────────────────

describe("buildTeacherSystemPrompt — learning mode", () => {
  it("includes K-12 friendly language guidance for k12 mode", () => {
    const prompt = buildTeacherSystemPrompt({ ...BASE_CTX, learning_mode: "k12" });
    expect(prompt).toContain("K-12");
  });

  it("includes academic language guidance for college mode", () => {
    const prompt = buildTeacherSystemPrompt({ ...BASE_CTX, learning_mode: "college" });
    expect(prompt).toContain("college undergraduate");
  });

  it("includes conversational guidance for self_taught mode", () => {
    const prompt = buildTeacherSystemPrompt({ ...BASE_CTX, learning_mode: "self_taught" });
    expect(prompt).toContain("self-taught");
  });
});

// ── Diagnostic level guidance ─────────────────────────────────────────────────

describe("buildTeacherSystemPrompt — diagnostic level", () => {
  it("emits BEGINNER guidance and lists gaps", () => {
    const prompt = buildTeacherSystemPrompt({
      ...BASE_CTX,
      diagnostic_result: { level: "beginner", gaps: ["velocity", "acceleration"] },
    });
    expect(prompt).toContain("BEGINNER");
    expect(prompt).toContain("velocity");
    expect(prompt).toContain("acceleration");
  });

  it("emits INTERMEDIATE guidance", () => {
    const prompt = buildTeacherSystemPrompt({
      ...BASE_CTX,
      diagnostic_result: { level: "intermediate", gaps: [] },
    });
    expect(prompt).toContain("INTERMEDIATE");
  });

  it("emits ADVANCED guidance", () => {
    const prompt = buildTeacherSystemPrompt({
      ...BASE_CTX,
      diagnostic_result: { level: "advanced", gaps: [] },
    });
    expect(prompt).toContain("ADVANCED");
  });

  it("emits fresh-start guidance when diagnostic_result is null", () => {
    const prompt = buildTeacherSystemPrompt({ ...BASE_CTX, diagnostic_result: null });
    expect(prompt).toContain("starting fresh");
  });
});

// ── Textbook context injection ─────────────────────────────────────────────────

describe("buildTeacherSystemPrompt — textbook context", () => {
  it("injects the textbook context verbatim", () => {
    const prompt = buildTeacherSystemPrompt(BASE_CTX);
    expect(prompt).toContain(
      "Projectile motion is motion in two dimensions under gravity alone."
    );
  });

  it("emits fallback message when textbook_context is empty", () => {
    const prompt = buildTeacherSystemPrompt({ ...BASE_CTX, textbook_context: "" });
    expect(prompt).toContain("No textbook context available");
  });

  it("includes the topic in the prompt", () => {
    const prompt = buildTeacherSystemPrompt(BASE_CTX);
    expect(prompt).toContain("Projectile Motion");
  });

  it("includes the subject in the prompt", () => {
    const prompt = buildTeacherSystemPrompt(BASE_CTX);
    expect(prompt).toContain("physics");
  });
});

// ── Depth rules always present ─────────────────────────────────────────────────

describe("buildTeacherSystemPrompt — depth rules", () => {
  it("always includes the 10-block minimum rule", () => {
    const prompt = buildTeacherSystemPrompt(BASE_CTX);
    expect(prompt).toContain("MINIMUM of 10 blocks");
  });

  it("always includes the 150-word text block rule", () => {
    const prompt = buildTeacherSystemPrompt(BASE_CTX);
    expect(prompt).toContain("150 words");
  });

  it("always includes the 5-step step_trace rule", () => {
    const prompt = buildTeacherSystemPrompt(BASE_CTX);
    expect(prompt).toContain("5 steps");
  });
});
