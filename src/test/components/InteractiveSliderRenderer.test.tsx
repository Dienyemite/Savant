/**
 * InteractiveSliderRenderer.test.tsx — Sprint 7.3.2
 *
 * Tests: slider renders, value updates on change, correct value → "correct".
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InteractiveSliderRenderer from "@/components/lesson/blocks/InteractiveSliderRenderer";
import { useLessonStore } from "@/store/lesson-store";
import type { InteractiveSliderBlock, Lesson } from "@/types";

const BLOCK: InteractiveSliderBlock = {
  id: "slider-test-1",
  type: "interactive_slider",
  order: 0,
  label: "Total apples",
  min: 0,
  max: 10,
  step: 1,
  initial_value: 0,
  correct_value: 7,
  unit: "apples",
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
      "slider-test-1": { value: 0, validationState: "idle", attempts: 0 },
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

describe("InteractiveSliderRenderer", () => {
  beforeEach(resetStore);

  it("renders the label", () => {
    render(<InteractiveSliderRenderer block={BLOCK} />);
    expect(screen.getByText(/total apples/i)).toBeDefined();
  });

  it("renders a range input", () => {
    render(<InteractiveSliderRenderer block={BLOCK} />);
    const slider = screen.getByRole("slider");
    expect(slider).toBeDefined();
  });

  it("changing slider value updates the store answer", () => {
    render(<InteractiveSliderRenderer block={BLOCK} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "5" } });

    const answer = useLessonStore.getState().answers["slider-test-1"];
    expect(answer.value).toBe(5);
  });

  it("submitting with correct value sets validationState to 'correct'", () => {
    render(<InteractiveSliderRenderer block={BLOCK} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "7" } }); // correct_value
    const submitBtn = screen.getByRole("button");
    fireEvent.click(submitBtn);

    const answer = useLessonStore.getState().answers["slider-test-1"];
    expect(answer.validationState).toBe("correct");
  });

  it("submitting with wrong value sets validationState to 'incorrect'", () => {
    render(<InteractiveSliderRenderer block={BLOCK} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "3" } }); // wrong value
    const submitBtn = screen.getByRole("button");
    fireEvent.click(submitBtn);

    const answer = useLessonStore.getState().answers["slider-test-1"];
    expect(answer.validationState).toBe("incorrect");
  });
});
