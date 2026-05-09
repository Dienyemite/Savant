/**
 * DragDropMatchRenderer.test.tsx — Sprint 7.3.3
 *
 * Tests: item selection, pairing, all correct → validates.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DragDropMatchRenderer from "@/components/lesson/blocks/DragDropMatchRenderer";
import { useLessonStore } from "@/store/lesson-store";
import type { DragDropMatchBlock } from "@/types";

const BLOCK: DragDropMatchBlock = {
  id: "dd-test-1",
  type: "drag_drop_match",
  order: 0,
  instruction: "Match each number to its double.",
  items: [
    { id: "item-1", content: "2" },
    { id: "item-2", content: "3" },
  ],
  targets: [
    { id: "target-a", label: "4" },
    { id: "target-b", label: "6" },
  ],
  correct_mapping: {
    "item-1": "target-a", // 2 → 4
    "item-2": "target-b", // 3 → 6
  },
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
      "dd-test-1": { value: {}, validationState: "idle", attempts: 0 },
    },
    activeLesson: STUB_LESSON as any,
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

describe("DragDropMatchRenderer", () => {
  beforeEach(resetStore);

  it("renders the instruction text", () => {
    render(<DragDropMatchRenderer block={BLOCK} />);
    expect(screen.getByText("Match each number to its double.")).toBeDefined();
  });

  it("renders all items", () => {
    render(<DragDropMatchRenderer block={BLOCK} />);
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
  });

  it("renders all targets", () => {
    render(<DragDropMatchRenderer block={BLOCK} />);
    expect(screen.getByText("4")).toBeDefined();
    expect(screen.getByText("6")).toBeDefined();
  });

  it("clicking item then target adds a mapping to the store", () => {
    render(<DragDropMatchRenderer block={BLOCK} />);
    // Click item "2"
    fireEvent.click(screen.getByText("2"));
    // Click target "4"
    fireEvent.click(screen.getByText("4"));

    const mapping = useLessonStore.getState().answers["dd-test-1"].value as Record<string, string>;
    expect(mapping["item-1"]).toBe("target-a");
  });

  it("completing all correct mappings and submitting sets validation to 'correct'", () => {
    render(<DragDropMatchRenderer block={BLOCK} />);

    // Pair item-1 → target-a
    fireEvent.click(screen.getByText("2"));
    fireEvent.click(screen.getByText("4"));

    // Pair item-2 → target-b
    fireEvent.click(screen.getByText("3"));
    fireEvent.click(screen.getByText("6"));

    // Submit
    const submitBtn = screen.getByRole("button", { name: /check|submit/i });
    fireEvent.click(submitBtn);

    const answer = useLessonStore.getState().answers["dd-test-1"];
    expect(answer.validationState).toBe("correct");
  });
});
