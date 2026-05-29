/**
 * src/test/fixtures/lesson.ts — Minimal Lesson fixture for unit tests.
 *
 * Provides a stable, type-correct Lesson object that exercises the
 * most common block types. Tests should import `mockLesson` rather than
 * reading from seed data, so fixture shape is predictable.
 */

import type { Lesson } from "@/types";

export const mockLesson: Lesson = {
  id: "test-lesson-1",
  concept_id: "test-concept-1",
  title: "Test Lesson",
  description: "A minimal lesson for unit tests.",
  order: 1,
  created_at: "2024-01-01T00:00:00.000Z",
  content_schema: [
    {
      id: "block-text-1",
      type: "text",
      order: 1,
      content: "## Introduction\n\nThis is a test lesson.",
      style: "body",
    },
    {
      id: "block-mc-1",
      type: "multiple_choice",
      order: 2,
      question: "What is 2 + 2?",
      options: [
        { id: "opt-a", text: "3" },
        { id: "opt-b", text: "4" },
        { id: "opt-c", text: "5" },
      ],
      correct_option_id: "opt-b",
    },
    {
      id: "block-slider-1",
      type: "interactive_slider",
      order: 3,
      label: "Set the value to 7",
      min: 0,
      max: 10,
      step: 1,
      initial_value: 0,
      correct_value: 7,
      unit: "units",
    },
  ],
};

/**
 * A lesson with only a text block (always advanceable without interaction).
 * Used in tests that need to advance slides without answering questions.
 */
export const mockTextOnlyLesson: Lesson = {
  id: "test-lesson-text-only",
  concept_id: "test-concept-1",
  title: "Text Only Lesson",
  description: null,
  order: 2,
  created_at: "2024-01-01T00:00:00.000Z",
  content_schema: [
    {
      id: "block-text-only-1",
      type: "text",
      order: 1,
      content: "Just reading material.",
    },
    {
      id: "block-text-only-2",
      type: "text",
      order: 2,
      content: "Second slide.",
    },
  ],
};
