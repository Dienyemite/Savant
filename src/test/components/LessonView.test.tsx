/**
 * LessonView.test.tsx — Sprint 7.3.3
 *
 * Tests keyboard navigation: ArrowRight/Left, Escape, and final-slide
 * completion triggering completeLesson() + updateProgress("mastered").
 */

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import LessonView from "@/components/lesson/LessonView";
import { useLessonStore } from "@/store/lesson-store";
import { useGraphStore } from "@/store/graph-store";
import { useCanvasStore } from "@/store/canvas-store";
import { useChatStore } from "@/store/chat-store";
import { LESSONS, CONCEPTS } from "@/data/seed";

// ── Mock heavy sub-components ─────────────────────────────

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    motion: new Proxy(actual.motion as unknown as Record<string, unknown>, {
      get: (_target, tag: string) =>
        React.forwardRef(
          ({ children: c, ...props }: React.HTMLAttributes<Element>, ref) =>
            React.createElement(tag, { ...props, ref }, c)
        ),
    }),
  };
});

vi.mock("@/components/lesson/NotebookCanvas", () => ({
  default: React.forwardRef(function NotebookCanvas(_props: unknown, _ref: unknown) {
    return React.createElement("div", { "data-testid": "notebook-canvas" });
  }),
}));

vi.mock("@/components/lesson/SocraticChat", () => ({
  default: () => React.createElement("div", { "data-testid": "socratic-chat" }),
}));

vi.mock("@/components/lesson/MarginaliaAnnotations", () => ({
  default: () => null,
}));

vi.mock("@/components/lesson/SelectionTrigger", () => ({
  default: () => null,
}));

vi.mock("@/components/lesson/LessonBlockRenderer", () => ({
  default: () => React.createElement("div", { "data-testid": "block-renderer" }),
}));

vi.mock("@/components/ErrorBoundary", () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock("@/lib/smart-annotation", () => ({
  buildAnnotationPrompt: vi.fn(),
  streamToMarginalia: vi.fn().mockResolvedValue(undefined),
}));

// ── Helpers ───────────────────────────────────────────────

const LESSON = LESSONS[0];
const mockUpdateProgress = vi.fn();

function setupStores(opts: { lastSlide?: boolean; canAdvance?: boolean } = {}) {
  const totalSlides = LESSON.content_schema.length;
  const currentSlideIndex = opts.lastSlide ? totalSlides - 1 : 0;

  const mockNextSlide = vi.fn();
  const mockPrevSlide = vi.fn();
  const mockExitLesson = vi.fn();
  const mockCompleteLesson = vi.fn();
  const mockCanAdvance = vi.fn().mockReturnValue(opts.canAdvance ?? true);

  useLessonStore.setState({
    activeLesson: LESSON,
    activeLessonConceptId: "c-addition",
    currentSlideIndex,
    totalSlides,
    isLessonActive: true,
    isLessonComplete: false,
    startedAt: Date.now(),
    completedAt: null,
    answers: {},
    spatialIndex: [],
    nextSlide: mockNextSlide,
    prevSlide: mockPrevSlide,
    exitLesson: mockExitLesson,
    completeLesson: mockCompleteLesson,
    canAdvance: mockCanAdvance,
    queryByRect: vi.fn().mockReturnValue([]),
    getCurrentBlock: vi.fn().mockReturnValue(LESSON.content_schema[currentSlideIndex]),
    getProgress: vi.fn().mockReturnValue((currentSlideIndex + 1) / totalSlides),
    getBlockAnswer: vi.fn().mockReturnValue({ value: null, validationState: "idle", attempts: 0 }),
    updateSpatialIndex: vi.fn(),
  });

  useGraphStore.setState({
    concepts: CONCEPTS,
    updateProgress: mockUpdateProgress,
    recentlyUnlockedIds: [],
    recentlyMasteredId: null,
  });

  useCanvasStore.setState({
    setStrokeCommitHandler: vi.fn(),
    clearStrokeCommitHandler: vi.fn(),
  });

  useChatStore.setState({
    addMarginaliaEntry: vi.fn().mockReturnValue("m-1"),
    updateMarginalia: vi.fn(),
    finishMarginalia: vi.fn(),
  });

  return { mockNextSlide, mockPrevSlide, mockExitLesson, mockCompleteLesson };
}

// ── Tests ─────────────────────────────────────────────────

describe("LessonView — keyboard navigation", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: vi.fn().mockResolvedValue(null) })
    );
    mockUpdateProgress.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("ArrowRight calls nextSlide() when canAdvance() is true", () => {
    const { mockNextSlide } = setupStores({ canAdvance: true });
    render(<LessonView />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(mockNextSlide).toHaveBeenCalledOnce();
  });

  it("ArrowRight does nothing when canAdvance() is false", () => {
    const { mockNextSlide } = setupStores({ canAdvance: false });
    render(<LessonView />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(mockNextSlide).not.toHaveBeenCalled();
  });

  it("ArrowLeft calls prevSlide()", () => {
    const { mockPrevSlide } = setupStores();
    render(<LessonView />);
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(mockPrevSlide).toHaveBeenCalledOnce();
  });

  it("Escape calls exitLesson()", () => {
    const { mockExitLesson } = setupStores();
    render(<LessonView />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(mockExitLesson).toHaveBeenCalledOnce();
  });

  it("ArrowRight on the last slide calls completeLesson() and updateProgress('mastered')", () => {
    const { mockCompleteLesson } = setupStores({ lastSlide: true, canAdvance: true });
    render(<LessonView />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(mockCompleteLesson).toHaveBeenCalledOnce();
    expect(mockUpdateProgress).toHaveBeenCalledWith("c-addition", "mastered");
  });
});
