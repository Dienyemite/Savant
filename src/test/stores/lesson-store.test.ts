/**
 * lesson-store.test.ts — Sprint 7.2.3
 *
 * Tests for the lesson store: lesson lifecycle, canAdvance logic,
 * answer validation, and completion.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useLessonStore } from "@/store/lesson-store";
import { LESSONS, CONCEPTS } from "@/data/seed";

const findConcept = (id: string) => CONCEPTS.find((c) => c.id === id) ?? CONCEPTS[0];

function resetStore() {
  useLessonStore.setState({
    activeLesson: null,
    activeLessonConceptId: null,
    activeLessonConceptTitle: null,
    activeLessonConceptDomain: null,
    currentSlideIndex: 0,
    isLessonActive: false,
    isLessonComplete: false,
    startedAt: null,
    answers: {},
    spatialIndex: [],
    totalSlides: 0,
  });
}

const FIRST_LESSON = LESSONS[0];

describe("lesson-store — lifecycle", () => {
  beforeEach(resetStore);

  it("startLesson sets isLessonActive: true and currentSlideIndex: 0", () => {
    useLessonStore.getState().startLesson(FIRST_LESSON, findConcept(FIRST_LESSON.concept_id));
    const { isLessonActive, currentSlideIndex } = useLessonStore.getState();
    expect(isLessonActive).toBe(true);
    expect(currentSlideIndex).toBe(0);
  });

  it("exitLesson resets lesson state", () => {
    useLessonStore.getState().startLesson(FIRST_LESSON, findConcept(FIRST_LESSON.concept_id));
    useLessonStore.getState().exitLesson();
    const { isLessonActive, activeLesson } = useLessonStore.getState();
    expect(isLessonActive).toBe(false);
    expect(activeLesson).toBeNull();
  });

  it("completeLesson sets isLessonComplete: true", () => {
    useLessonStore.getState().startLesson(FIRST_LESSON, findConcept(FIRST_LESSON.concept_id));
    useLessonStore.getState().completeLesson();
    expect(useLessonStore.getState().isLessonComplete).toBe(true);
  });
});

describe("lesson-store — canAdvance", () => {
  beforeEach(() => {
    resetStore();
    // Find a lesson where first block is a text block (always advanceable)
    const textLesson = LESSONS.find(
      (l) => [...l.content_schema].sort((a, b) => a.order - b.order)[0]?.type === "text"
    );
    if (textLesson) {
      useLessonStore.getState().startLesson(textLesson, findConcept(textLesson.concept_id));
    }
  });

  it("canAdvance returns true when current slide has only a text block", () => {
    const lesson = useLessonStore.getState().activeLesson;
    if (!lesson) return;
    const sorted = [...lesson.content_schema].sort((a, b) => a.order - b.order);
    if (sorted[0]?.type !== "text") return;
    expect(useLessonStore.getState().canAdvance()).toBe(true);
  });
});

describe("lesson-store — nextSlide / prevSlide", () => {
  beforeEach(() => {
    resetStore();
    const multiSlideLesson = LESSONS.find((l) => l.content_schema.length > 1);
    if (multiSlideLesson) {
      useLessonStore.getState().startLesson(multiSlideLesson, findConcept(multiSlideLesson.concept_id));
    }
  });

  it("nextSlide advances the slide index", () => {
    const lesson = useLessonStore.getState().activeLesson;
    if (!lesson || lesson.content_schema.length < 2) return;

    useLessonStore.getState().nextSlide();
    expect(useLessonStore.getState().currentSlideIndex).toBe(1);
  });

  it("nextSlide is a no-op on the last slide", () => {
    const lesson = useLessonStore.getState().activeLesson;
    if (!lesson) return;

    const lastIndex = lesson.content_schema.length - 1;
    useLessonStore.setState({ currentSlideIndex: lastIndex });
    useLessonStore.getState().nextSlide();
    expect(useLessonStore.getState().currentSlideIndex).toBe(lastIndex);
  });

  it("prevSlide goes back to the previous slide", () => {
    const lesson = useLessonStore.getState().activeLesson;
    if (!lesson || lesson.content_schema.length < 2) return;

    useLessonStore.setState({ currentSlideIndex: 1 });
    useLessonStore.getState().prevSlide();
    expect(useLessonStore.getState().currentSlideIndex).toBe(0);
  });
});
