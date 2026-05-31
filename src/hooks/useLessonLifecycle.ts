"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLessonStore } from "@/store/lesson-store";
import { useGraphStore } from "@/store/graph-store";
import { useCanvasStore } from "@/store/canvas-store";
import { useChatStore } from "@/store/chat-store";
import { buildAnnotationPrompt, streamToMarginalia } from "@/lib/smart-annotation";
import type { NotebookCanvasHandle } from "@/components/lesson/NotebookCanvas";

// ════════════════════════════════════════════════════════════
// useLessonLifecycle
//
// Extracts all lifecycle concerns from LessonView:
//   - Canvas load/save (persisted per concept)
//   - Annotation hydration from DB
//   - Keyboard navigation (←/→/Esc)
//   - Stroke commit handler registration (Smart Annotation)
//   - Highlight-to-marginalia handler
//   - Debug spatial-index flag
//
// Returns derived action callbacks and the debug flag.
// LessonView keeps only rendering state (JSX + display values).
// ════════════════════════════════════════════════════════════

interface UseLessonLifecycleOptions {
  canvasRef: React.RefObject<NotebookCanvasHandle | null>;
  conceptTitle: string | undefined;
}

interface UseLessonLifecycleReturn {
  handleNext: () => void;
  handlePrev: () => void;
  handleComplete: () => void;
  handleExit: () => void;
  handleHighlightComplete: (rect: DOMRect) => Promise<void>;
  scheduleCanvasSave: () => void;
  isDebugSpatial: boolean;
}

export function useLessonLifecycle({
  canvasRef,
  conceptTitle,
}: UseLessonLifecycleOptions): UseLessonLifecycleReturn {
  const {
    activeLessonConceptId,
    isLessonActive,
    canAdvance,
    currentSlideIndex,
    nextSlide,
    prevSlide,
    exitLesson,
    completeLesson,
    queryByRect,
  } = useLessonStore();

  const { updateProgress } = useGraphStore();
  const { setStrokeCommitHandler, clearStrokeCommitHandler } = useCanvasStore();
  const { addMarginaliaEntry, updateMarginalia, finishMarginalia } = useChatStore();

  // ── Debug spatial overlay ──────────────────────────────────
  const [isDebugSpatial, setIsDebugSpatial] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDebugSpatial(
        new URLSearchParams(window.location.search).get("debug") === "spatial"
      );
    }
  }, []);

  // ── Canvas save (debounced, 500 ms) ───────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleCanvasSave = useCallback(() => {
    if (!activeLessonConceptId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const state = canvasRef.current?.getState();
      if (!state) return;
      fetch("/api/canvas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptId: activeLessonConceptId,
          strokes: state.strokes,
          textNodes: state.textNodes,
        }),
      }).catch(() => {/* silent */});
    }, 500);
  }, [activeLessonConceptId, canvasRef]);

  // ── Load persisted canvas state ───────────────────────────
  useEffect(() => {
    if (!activeLessonConceptId || !isLessonActive) return;
    fetch(`/api/canvas?conceptId=${encodeURIComponent(activeLessonConceptId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { strokes?: unknown[]; textNodes?: unknown[] } | null) => {
        if (!json) return;
        canvasRef.current?.loadState({
          strokes: (json.strokes ?? []) as import("@/components/lesson/NotebookCanvas").CanvasState["strokes"],
          textNodes: (json.textNodes ?? []) as import("@/components/lesson/NotebookCanvas").CanvasState["textNodes"],
        });
      })
      .catch(() => {/* silent — blank canvas on load failure */});
  }, [activeLessonConceptId, isLessonActive, canvasRef]);

  // ── Load persisted annotations ────────────────────────────
  useEffect(() => {
    if (!activeLessonConceptId || !isLessonActive) return;
    fetch(`/api/annotations?conceptId=${encodeURIComponent(activeLessonConceptId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (json: {
          data?: {
            anchor_y: number;
            selected_text: string;
            content: string;
            annotation_type: string;
          }[];
        } | null) => {
          if (!json?.data) return;
          for (const a of json.data) {
            const source = a.annotation_type === "highlight" ? "highlight" : "selection";
            const id = addMarginaliaEntry(a.anchor_y, a.selected_text, source as "selection" | "highlight");
            updateMarginalia(id, a.content);
            finishMarginalia(id);
          }
        }
      )
      .catch(() => {/* silent */});
  // Only run once per lesson session — not on every currentSlideIndex change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLessonConceptId, isLessonActive]);

  // ── Action callbacks ──────────────────────────────────────
  const handleComplete = useCallback(() => {
    completeLesson();
    if (activeLessonConceptId) {
      updateProgress(activeLessonConceptId, "mastered");
    }
  }, [completeLesson, activeLessonConceptId, updateProgress]);

  const handleExit = useCallback(() => exitLesson(), [exitLesson]);

  const handleNext = useCallback(() => {
    canvasRef.current?.clear();
    const isLastSlide = useLessonStore.getState().currentSlideIndex === useLessonStore.getState().totalSlides - 1;
    if (isLastSlide) {
      handleComplete();
    } else {
      nextSlide();
    }
  }, [canvasRef, handleComplete, nextSlide]);

  const handlePrev = useCallback(() => {
    canvasRef.current?.clear();
    prevSlide();
  }, [canvasRef, prevSlide]);

  // ── Keyboard navigation ───────────────────────────────────
  useEffect(() => {
    if (!isLessonActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && canAdvance()) handleNext();
      else if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "Escape") handleExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLessonActive, canAdvance, handleNext, handlePrev, handleExit]);

  // ── Stroke commit handler (Smart Annotation — constellation level) ────
  useEffect(() => {
    if (!isLessonActive) return;
    setStrokeCommitHandler((stroke) => {
      if (stroke.tool !== "highlight") return;
      if (process.env.NODE_ENV !== "production") {
        console.log("[SmartAnnotation] constellation highlight", stroke.id);
      }
    });
    return () => clearStrokeCommitHandler();
  }, [isLessonActive, setStrokeCommitHandler, clearStrokeCommitHandler]);

  // ── Highlight-to-marginalia (lesson context) ──────────────
  const handleHighlightComplete = useCallback(
    async (rect: DOMRect) => {
      const coveredBlocks = queryByRect(rect);
      if (coveredBlocks.length === 0) return;

      const coveredText = coveredBlocks.map((b) => b.text).join(" ");
      const anchorY = rect.top + rect.height / 2;
      const marginaliaId = addMarginaliaEntry(anchorY, coveredText, "highlight");

      const annotationPrompt = buildAnnotationPrompt({
        coveredText,
        conceptTitle: conceptTitle ?? "this concept",
        slideIndex: currentSlideIndex,
      });

      await streamToMarginalia(marginaliaId, annotationPrompt, {
        updateMarginalia,
        finishMarginalia,
      });
      scheduleCanvasSave();
    },
    [queryByRect, addMarginaliaEntry, conceptTitle, currentSlideIndex, updateMarginalia, finishMarginalia, scheduleCanvasSave]
  );

  return {
    handleNext,
    handlePrev,
    handleComplete,
    handleExit,
    handleHighlightComplete,
    scheduleCanvasSave,
    isDebugSpatial,
  };
}
