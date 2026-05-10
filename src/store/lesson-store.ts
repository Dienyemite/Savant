import { create } from "zustand";
import type { Lesson, LessonBlock, SpatialBlock } from "@/types";
import { rectIntersects } from "@/lib/utils";
import { useChatStore } from "@/store/chat-store";
import { useTelemetryStore } from "@/store/telemetry-store";

// Analytics helper — fire-and-forget, only runs in browser
function analyticsTrack(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  import("@vercel/analytics").then(({ track }) => {
    track(event, props as Record<string, string | number>);
  }).catch(() => {/* analytics unavailable */});
}

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

  // Spatial index for Smart Annotation hit-testing (Sprint 4.4)
  spatialIndex: SpatialBlock[];
  updateSpatialIndex: (blocks: SpatialBlock[]) => void;
  queryByRect: (rect: DOMRect) => SpatialBlock[];

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
  spatialIndex: [],
  isLessonActive: false,
  isLessonComplete: false,
  startedAt: null,
  completedAt: null,

  updateSpatialIndex: (blocks) => {
    set((state) => {
      // Merge: replace entries with matching blockId, append new ones
      const existing = state.spatialIndex.filter(
        (s) => !blocks.some((b) => b.blockId === s.blockId)
      );
      return { spatialIndex: [...existing, ...blocks] };
    });
  },

  queryByRect: (rect) => {
    return get().spatialIndex.filter((b) => rectIntersects(b.rect, rect));
  },

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

    // Start telemetry session
    useTelemetryStore.getState().startSession(lesson.id, conceptId);
    // Track funnel event
    analyticsTrack("lesson_started", { conceptId, lessonId: lesson.id });
    // Enter first slide
    if (sorted.length > 0) {
      useTelemetryStore.getState().enterSlide(sorted[0].id, sorted[0].type);
    }
  },

  exitLesson: () => {
    useChatStore.getState().resetChat();
    useTelemetryStore.getState().resetSession();
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
    });
  },

  nextSlide: () =>
    set((state) => {
      const next = state.currentSlideIndex + 1;
      if (next >= state.totalSlides) return state;
      // Track slide transition in telemetry
      const sorted = state.activeLesson
        ? [...state.activeLesson.content_schema].sort((a, b) => a.order - b.order)
        : [];
      if (sorted[next]) {
        useTelemetryStore.getState().enterSlide(sorted[next].id, sorted[next].type);
      }
      return { currentSlideIndex: next, spatialIndex: [] };
    }),

  prevSlide: () =>
    set((state) => {
      const prev = state.currentSlideIndex - 1;
      if (prev < 0) return state;
      const sorted = state.activeLesson
        ? [...state.activeLesson.content_schema].sort((a, b) => a.order - b.order)
        : [];
      if (sorted[prev]) {
        useTelemetryStore.getState().enterSlide(sorted[prev].id, sorted[prev].type);
      }
      return { currentSlideIndex: prev, spatialIndex: [] };
    }),

  goToSlide: (index) =>
    set((state) => {
      if (index < 0 || index >= state.totalSlides) return state;
      return { currentSlideIndex: index };
    }),

  setAnswer: (blockId, value) => {
    useTelemetryStore.getState().recordInteraction();
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
    }));
  },

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

    const newAttempts = (state.answers[blockId]?.attempts ?? 0) + 1;

    set((s) => ({
      answers: {
        ...s.answers,
        [blockId]: {
          ...s.answers[blockId],
          validationState,
          attempts: newAttempts,
        },
      },
    }));

    // Record attempt in telemetry
    useTelemetryStore.getState().recordAttempt(
      validationState as "correct" | "incorrect"
    );

    // Auto-trigger Socratic tutor after 2 failed attempts (per spec §2.3)
    if (validationState === "incorrect" && newAttempts >= 2) {
      useChatStore.getState().triggerFromFailure();
    }

    return validationState;
  },

  completeLesson: () => {
    useTelemetryStore.getState().completeSession();
    const { activeLesson, activeLessonConceptId, currentSlideIndex, totalSlides, startedAt } = get();
    analyticsTrack("lesson_completed", {
      conceptId: activeLessonConceptId ?? "",
      lessonId: activeLesson?.id ?? "",
      slideCount: totalSlides,
      durationMs: startedAt ? Date.now() - startedAt : 0,
    });
    set({
      isLessonComplete: true,
      completedAt: Date.now(),
    });
  },
}));
