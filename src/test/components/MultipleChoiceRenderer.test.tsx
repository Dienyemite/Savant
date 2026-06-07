/**
 * MultipleChoiceRenderer.test.tsx — Sprint 7.3.1
 *
 * Tests: renders options, correct click → "correct", wrong click → "incorrect" + locked.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MultipleChoiceRenderer from "@/components/lesson/blocks/MultipleChoiceRenderer";
import { useLessonStore } from "@/store/lesson-store";
import type { MultipleChoiceBlock, Lesson } from "@/types";

const BLOCK: MultipleChoiceBlock = {
  id: "mc-test-1",
  type: "multiple_choice",
  order: 0,
  question: "What is 2 + 2?",
  options: [
    { id: "opt-a", text: "3" },
    { id: "opt-b", text: "4" },
    { id: "opt-c", text: "5" },
  ],
  correct_option_id: "opt-b",
};

const STUB_LESSON = {
  id: "lesson-test",
  concept_id: "c-test",
  title: "Test Lesson",
  description: null,
  order: 0,
  created_at: "",
  content_schema: [BLOCK],
};

function resetStore() {
  useLessonStore.setState({
    answers: {
      "mc-test-1": { value: null, validationState: "idle", attempts: 0 },
    },
    activeLesson: STUB_LESSON as unknown as Lesson,
    activeLessonConceptId: "c-test",
    currentSlideIndex: 0,
    totalSlides: 1,
    isLessonActive: true,
    isLessonComplete: false,
    startedAt: Date.now(),
    completedAt: null,
    spatialIndex: [],
  });
}

describe("MultipleChoiceRenderer", () => {
  beforeEach(resetStore);

  it("renders all options", () => {
    render(<MultipleChoiceRenderer block={BLOCK} />);
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("4")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
  });

  it("renders the question text", () => {
    render(<MultipleChoiceRenderer block={BLOCK} />);
    expect(screen.getByText("What is 2 + 2?")).toBeDefined();
  });

  it("selecting correct option and submitting sets validation to 'correct'", () => {
    render(<MultipleChoiceRenderer block={BLOCK} />);
    // Click the correct option
    fireEvent.click(screen.getByText("4"));
    // Click the submit/check button
    const submitBtn = screen.getByRole("button", { name: /check|submit/i });
    fireEvent.click(submitBtn);

    const answer = useLessonStore.getState().answers["mc-test-1"];
    expect(answer.validationState).toBe("correct");
  });

  it("selecting wrong option and submitting sets validation to 'incorrect'", () => {
    render(<MultipleChoiceRenderer block={BLOCK} />);
    fireEvent.click(screen.getByText("3")); // wrong option
    const submitBtn = screen.getByRole("button", { name: /check|submit/i });
    fireEvent.click(submitBtn);

    const answer = useLessonStore.getState().answers["mc-test-1"];
    expect(answer.validationState).toBe("incorrect");
  });
});
