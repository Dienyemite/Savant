import { create } from "zustand";
import type { Lesson, LessonBlock } from "@/types";

// ============================================
// Lesson Engine Store
// Tracks current lesson, slide position, student
// inputs, validation state, and attempt counts.
// ============================================

export type ValidationState = "idle" | "correct" | "incorrect";

export interface BlockAnswer {
  value: unknown;
  validationState: ValidationState;
  attempts: number;
}

interface LessonState {
  // Active lesson
  activeLesson: Lesson | null;
  activeLessonConceptId: string | null;

  // Slide navigation — each "slide" is one block from content_schema
  currentSlideIndex: number;
  totalSlides: number;

  // Per-block student answers keyed by block id
  answers: Record<string, BlockAnswer>;

  // Overall lesson state
  isLessonActive: boolean;
  isLessonComplete: boolean;
  startedAt: number | null; // timestamp ms
  completedAt: number | null;

  // Derived
  getCurrentBlock: () => LessonBlock | null;
  getBlockAnswer: (blockId: string) => BlockAnswer;
  canAdvance: () => boolean;
  getProgress: () => number; // 0-1

  // Actions
  startLesson: (lesson: Lesson, conceptId: string) => void;
  exitLesson: () => void;
  nextSlide: () => void;
  prevSlide: () => void;
  goToSlide: (index: number) => void;
  setAnswer: (blockId: string, value: unknown) => void;
  validateBlock: (blockId: string) => ValidationState;
  completeLesson: () => void;
}

export const useLessonStore = create<LessonState>((set, get) => ({
  activeLesson: null,
  activeLessonConceptId: null,
  currentSlideIndex: 0,
  totalSlides: 0,
  answers: {},
  isLessonActive: false,
  isLessonComplete: false,
  startedAt: null,
  completedAt: null,

  getCurrentBlock: () => {
    const { activeLesson, currentSlideIndex } = get();
    if (!activeLesson) return null;
    const sorted = [...activeLesson.content_schema].sort(
      (a, b) => a.order - b.order
    );
    return sorted[currentSlideIndex] ?? null;
  },

  getBlockAnswer: (blockId: string) => {
    return (
      get().answers[blockId] ?? {
        value: undefined,
        validationState: "idle" as ValidationState,
        attempts: 0,
      }
    );
  },

  canAdvance: () => {
    const state = get();
    const block = state.getCurrentBlock();
    if (!block) return false;

    // Text blocks can always advance
    if (block.type === "text" || block.type === "visual_feedback") return true;

    // Interactive blocks require correct answer
    const answer = state.answers[block.id];
    return answer?.validationState === "correct";
  },

  getProgress: () => {
    const { currentSlideIndex, totalSlides } = get();
    if (totalSlides === 0) return 0;
    return (currentSlideIndex + 1) / totalSlides;
  },

  startLesson: (lesson, conceptId) => {
    const sorted = [...lesson.content_schema].sort(
      (a, b) => a.order - b.order
    );
    // Pre-populate answers for interactive blocks
    const initialAnswers: Record<string, BlockAnswer> = {};
    for (const block of sorted) {
      if (block.type === "interactive_slider") {
        initialAnswers[block.id] = {
          value: block.initial_value,
          validationState: "idle",
          attempts: 0,
        };
      } else if (block.type === "drag_drop_match") {
        initialAnswers[block.id] = {
          value: {} as Record<string, string>,
          validationState: "idle",
          attempts: 0,
        };
      } else if (block.type === "formula_builder") {
        initialAnswers[block.id] = {
          value: [] as string[],
          validationState: "idle",
          attempts: 0,
        };
      } else if (block.type === "multiple_choice") {
        initialAnswers[block.id] = {
          value: null,
          validationState: "idle",
          attempts: 0,
        };
      }
    }

    set({
      activeLesson: lesson,
      activeLessonConceptId: conceptId,
      currentSlideIndex: 0,
      totalSlides: sorted.length,
      answers: initialAnswers,
      isLessonActive: true,
      isLessonComplete: false,
      startedAt: Date.now(),
      completedAt: null,
    });
  },

  exitLesson: () =>
    set({
      activeLesson: null,
      activeLessonConceptId: null,
      currentSlideIndex: 0,
      totalSlides: 0,
      answers: {},
      isLessonActive: false,
      isLessonComplete: false,
      startedAt: null,
      completedAt: null,
    }),

  nextSlide: () =>
    set((state) => {
      const next = state.currentSlideIndex + 1;
      if (next >= state.totalSlides) return state;
      return { currentSlideIndex: next };
    }),

  prevSlide: () =>
    set((state) => {
      const prev = state.currentSlideIndex - 1;
      if (prev < 0) return state;
      return { currentSlideIndex: prev };
    }),

  goToSlide: (index) =>
    set((state) => {
      if (index < 0 || index >= state.totalSlides) return state;
      return { currentSlideIndex: index };
    }),

  setAnswer: (blockId, value) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [blockId]: {
          ...state.answers[blockId],
          value,
          // Reset validation when answer changes
          validationState: "idle" as ValidationState,
          attempts: state.answers[blockId]?.attempts ?? 0,
        },
      },
    })),

  validateBlock: (blockId) => {
    const state = get();
    const lesson = state.activeLesson;
    if (!lesson) return "idle";

    const block = lesson.content_schema.find((b) => b.id === blockId);
    if (!block) return "idle";

    const answer = state.answers[blockId];
    if (!answer || answer.value === undefined || answer.value === null)
      return "idle";

    let isCorrect = false;

    switch (block.type) {
      case "interactive_slider":
        isCorrect = answer.value === block.correct_value;
        break;

      case "multiple_choice":
        isCorrect = answer.value === block.correct_option_id;
        break;

      case "drag_drop_match": {
        const mapping = answer.value as Record<string, string>;
        const correct = block.correct_mapping;
        isCorrect =
          Object.keys(correct).length === Object.keys(mapping).length &&
          Object.entries(correct).every(
            ([itemId, targetId]) => mapping[itemId] === targetId
          );
        break;
      }

      case "formula_builder": {
        const tokens = answer.value as string[];
        isCorrect =
          tokens.length === block.correct_formula.length &&
          tokens.every((t, i) => t === block.correct_formula[i]);
        break;
      }

      default:
        return "idle";
    }

    const validationState: ValidationState = isCorrect
      ? "correct"
      : "incorrect";

    set((s) => ({
      answers: {
        ...s.answers,
        [blockId]: {
          ...s.answers[blockId],
          validationState,
          attempts: (s.answers[blockId]?.attempts ?? 0) + 1,
        },
      },
    }));

    return validationState;
  },

  completeLesson: () =>
    set({
      isLessonComplete: true,
      completedAt: Date.now(),
    }),
}));
