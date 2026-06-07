"use client";

import { useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLessonStore } from "@/store/lesson-store";
import { useGraphStore } from "@/store/graph-store";
import { useTelemetryStore } from "@/store/telemetry-store";
import { DOMAIN_LABELS } from "@/types";
import LessonBlockRenderer from "./LessonBlockRenderer";
import NotebookCanvas, { type NotebookCanvasHandle } from "./NotebookCanvas";
import SocraticChat from "./SocraticChat";
import MarginaliaAnnotations from "./MarginaliaAnnotations";
import ErrorBoundary from "@/components/ErrorBoundary";
import SelectionTrigger from "./SelectionTrigger";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useLessonLifecycle } from "@/hooks/useLessonLifecycle";

// ════════════════════════════════════════════════════════════
// LessonView — The notebook page learning experience.
//
// Lessons render directly onto a ruled notebook page.
// Each "slide" is a page. The canvas overlay lets the user
// annotate with stylus or mouse, type notes, and sketch.
// Navigation = turning pages. No modal chrome.
// ════════════════════════════════════════════════════════════

const pageVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "4%" : "-4%",
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir < 0 ? "4%" : "-4%",
    opacity: 0,
  }),
};

export default function LessonView() {
  const {
    activeLesson,
    activeLessonConceptId,
    currentSlideIndex,
    totalSlides,
    isLessonActive,
    isLessonComplete,
    startedAt,
    canAdvance,
    getProgress,
    getCurrentBlock,
    updateSpatialIndex,
    spatialIndex,
  } = useLessonStore();

  const { concepts, recentlyUnlockedIds } = useGraphStore();
  const canvasRef = useRef<NotebookCanvasHandle>(null);
  /** Ref for the scrollable content column — used by SelectionTrigger */
  const contentRef = useRef<HTMLDivElement>(null);

  const concept = useMemo(
    () => concepts.find((c) => c.id === activeLessonConceptId),
    [concepts, activeLessonConceptId]
  );

  const {
    handleNext,
    handlePrev,
    handleComplete,
    handleExit,
    handleHighlightComplete,
    isDebugSpatial,
  } = useLessonLifecycle({ canvasRef, conceptTitle: concept?.title });

  const currentBlock = getCurrentBlock();
  const isLastSlide = currentSlideIndex === totalSlides - 1;

  // Elapsed time for the page footer note — Date.now() is intentional here
  // eslint-disable-next-line react-hooks/purity
  const elapsedSeconds = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = getProgress();
  const pageNumber = currentSlideIndex + 1;
  const domainLabel = concept ? DOMAIN_LABELS[concept.domain] : "";

  return (
    <AnimatePresence>
      {isLessonActive && activeLesson ? (
        <motion.div
          key="lesson-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-50 bg-black notebook-ruled notebook-margin"
        >
      {/* ── Page header ── */}
      <header
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-16 py-3 border-b border-white/[0.06]"
        style={{ fontFamily: "'Courier New', monospace" }}
      >
        <div className="flex items-baseline gap-4">
          {/* Close / back to constellation */}
          <button
            onClick={handleExit}
            className="text-white/20 hover:text-white/55 transition-colors mr-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] tracking-[0.2em] uppercase text-white/20">
            {domainLabel}
          </span>
          <span className="text-xs text-white/50 truncate max-w-xs">
            {activeLesson.title}
          </span>
        </div>
        <div className="flex items-center gap-5 text-[10px] tracking-widest text-white/20">
          <span>{formatTime(elapsedSeconds)}</span>
          <span>
            {pageNumber} / {totalSlides}
          </span>
        </div>
      </header>

      {/* ── Lesson page body ── */}
      <div
        ref={contentRef}
        className="absolute inset-0 pt-12 pb-14 flex flex-col items-center justify-start overflow-y-auto"
      >
        <AnimatePresence mode="wait" custom={1}>
          {!isLessonComplete ? (
            <motion.div
              key={currentSlideIndex}
              custom={1}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="relative w-full max-w-2xl px-6 pt-10 pb-20"
            >
              {/* Block content — rendered on the notebook page */}
              <div className="relative z-10">
                {currentBlock && (
                  <LessonBlockRenderer
                    block={currentBlock}
                    onSpatialUpdate={updateSpatialIndex}
                  />
                )}
              </div>

              {/*
                Phase 5: Marginalia annotations appear in the right
                gutter — one per text selection that triggered the tutor.
                Positioned relative to the content column.
              */}
              <MarginaliaAnnotations
                conceptId={activeLessonConceptId ?? undefined}
                slideIndex={currentSlideIndex}
              />

              {/* ── Canvas annotation overlay ── */}
              <NotebookCanvas
                ref={canvasRef}
                scrollRef={contentRef}
                className="z-20"
                onHighlightComplete={handleHighlightComplete}
              />
            </motion.div>
          ) : (
            /* ── Completion — minimal notebook entry ── */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-xl px-6 pt-16 space-y-10 text-center"
              style={{ fontFamily: "'ivy-presto', serif" }}
            >
              {/* Ruled section header */}
              <div className="border-b border-white/[0.07] pb-6">
                <p
                  className="text-[10px] tracking-[0.25em] uppercase text-white/20 mb-2"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  Entry complete
                </p>
                <h2 className="text-2xl text-white/80">
                  {activeLesson.title}
                </h2>
                <p className="text-sm text-white/30 mt-1">
                  Concept mastered.
                </p>
              </div>

              {/* Stats as notebook table entries */}
              <div
                className="grid grid-cols-3 gap-px border border-white/[0.06] text-left"
                style={{ fontFamily: "'Courier New', monospace" }}
              >
                {[
                  { label: "Duration", value: formatTime(elapsedSeconds) },
                  { label: "Pages", value: String(totalSlides) },
                  {
                    label: "Focus",
                    value: (() => {
                      const sessions = useTelemetryStore.getState().completedSessions;
                      const last = sessions[sessions.length - 1];
                      return last
                        ? `${Math.round(last.productiveStruggleScore * 100)}%`
                        : "—";
                    })(),
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="px-4 py-3 border-r border-white/[0.06] last:border-r-0"
                  >
                    <p className="text-[9px] tracking-[0.18em] uppercase text-white/20 mb-1">
                      {s.label}
                    </p>
                    <p className="text-base text-white/70">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Newly unlocked */}
              {recentlyUnlockedIds.length > 0 && (
                <div className="border-t border-white/[0.06] pt-6 space-y-3">
                  <p
                    className="text-[10px] tracking-[0.2em] uppercase text-white/20"
                    style={{ fontFamily: "'Courier New', monospace" }}
                  >
                    New paths unlocked
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {recentlyUnlockedIds.map((uid) => {
                      const unlocked = concepts.find((c) => c.id === uid);
                      if (!unlocked) return null;
                      return (
                        <span
                          key={uid}
                          className="text-xs text-white/50 border border-white/10 px-3 py-1"
                          style={{ fontFamily: "'Courier New', monospace" }}
                        >
                          {unlocked.title}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Return */}
              <button
                onClick={handleExit}
                className="text-[11px] tracking-[0.2em] uppercase text-white/30 hover:text-white/60 transition-colors border-b border-white/10 hover:border-white/30 pb-px"
                style={{ fontFamily: "'Courier New', monospace" }}
              >
                Return to Constellation →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Page footer — navigation ── */}
      {!isLessonComplete && (
        <footer
          className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-16 py-3 border-t border-white/[0.06]"
          style={{ fontFamily: "'Courier New', monospace" }}
        >
          {/* Progress rule */}
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-1 h-px bg-white/[0.06] relative">
              <div
                className="absolute left-0 top-0 h-full bg-white/30 transition-all duration-500"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>

          {/* Page-turn navigation */}
          <div className="flex items-center gap-4 ml-8">
            <button
              onClick={handlePrev}
              disabled={currentSlideIndex === 0}
              className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-white/20 hover:text-white/50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Prev
            </button>

            {/* Page dots */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <div
                  key={i}
                  className="transition-all duration-300"
                  style={{
                    width: i === currentSlideIndex ? 12 : 4,
                    height: 1,
                    background:
                      i === currentSlideIndex
                        ? "rgba(255,255,255,0.55)"
                        : i < currentSlideIndex
                        ? "rgba(255,255,255,0.25)"
                        : "rgba(255,255,255,0.08)",
                  }}
                />
              ))}
            </div>

            {isLastSlide ? (
              <button
                onClick={handleComplete}
                disabled={!canAdvance()}
                className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-white/55 hover:text-white/90 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                Complete
                <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canAdvance()}
                className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-white/20 hover:text-white/50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </footer>
      )}

      {/* Socratic AI Tutor — side panel (auto-triggered after 2 failures) */}
      <ErrorBoundary>
        <SocraticChat />
      </ErrorBoundary>

      {/*
        Phase 5: Selection trigger — shows "≣ Ask Savant" button
        when the student highlights text in the lesson content.
        Invokes the tutor and renders its response as a marginalia
        annotation positioned next to the selected text.
      */}
      <SelectionTrigger containerRef={contentRef} />

      {/* ── Dev: Spatial index debug overlay (?debug=spatial) ── */}
      {isDebugSpatial && spatialIndex.map((b, i) => (
        <div
          key={`${b.blockId}-${b.paragraphIndex}-${i}`}
          style={{
            position: "fixed",
            left: b.rect.left,
            top: b.rect.top,
            width: b.rect.width,
            height: b.rect.height,
            outline: "1px solid rgba(255, 80, 80, 0.6)",
            pointerEvents: "none",
            zIndex: 9999,
          }}
        />
      ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}


// ============================================
// LessonView — Full-screen lesson experience
// Renders one block per slide with smooth
// Framer Motion transitions between slides.
// ============================================

// Slide transition variants
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.96,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    scale: 0.96,
  }),
};
