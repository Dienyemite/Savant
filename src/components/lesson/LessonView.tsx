"use client";

import { useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLessonStore } from "@/store/lesson-store";
import { useGraphStore } from "@/store/graph-store";
import { useTelemetryStore } from "@/store/telemetry-store";
import { DOMAIN_LABELS } from "@/types";
import LessonBlockRenderer from "./LessonBlockRenderer";
import NotebookCanvas, { type NotebookCanvasHandle } from "./NotebookCanvas";
import SocraticChat from "./SocraticChat";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

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
    nextSlide,
    prevSlide,
    exitLesson,
    completeLesson,
  } = useLessonStore();

  const { updateProgress, concepts, recentlyUnlockedIds } = useGraphStore();
  const canvasRef = useRef<NotebookCanvasHandle>(null);

  const currentBlock = getCurrentBlock();
  const isLastSlide = currentSlideIndex === totalSlides - 1;

  const concept = useMemo(
    () => concepts.find((c) => c.id === activeLessonConceptId),
    [concepts, activeLessonConceptId]
  );

  // Elapsed time for the page footer note
  const elapsedSeconds = startedAt
    ? Math.floor((Date.now() - startedAt) / 1000)
    : 0;
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Progress fraction
  const progress = getProgress();

  // Clear canvas annotations when turning pages
  const handleNext = useCallback(() => {
    canvasRef.current?.clear();
    if (isLastSlide) {
      handleComplete();
    } else {
      nextSlide();
    }
  }, [isLastSlide, nextSlide]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrev = useCallback(() => {
    canvasRef.current?.clear();
    prevSlide();
  }, [prevSlide]);

  const handleComplete = useCallback(() => {
    completeLesson();
    if (activeLessonConceptId) {
      updateProgress(activeLessonConceptId, "mastered");
    }
  }, [completeLesson, activeLessonConceptId, updateProgress]);

  const handleExit = useCallback(() => exitLesson(), [exitLesson]);

  // Keyboard navigation
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

  if (!isLessonActive || !activeLesson) return null;

  const pageNumber = currentSlideIndex + 1;
  const domainLabel = concept ? DOMAIN_LABELS[concept.domain] : "";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
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
      <div className="absolute inset-0 pt-12 pb-14 flex flex-col items-center justify-start overflow-y-auto">
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
                  <LessonBlockRenderer block={currentBlock} />
                )}
              </div>

              {/* ── Canvas annotation overlay ── */}
              <NotebookCanvas
                ref={canvasRef}
                className="z-20"
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

      {/* Socratic AI Tutor */}
      <SocraticChat />
    </motion.div>
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
    nextSlide,
    prevSlide,
    exitLesson,
    completeLesson,
  } = useLessonStore();

  const { updateProgress, concepts, recentlyUnlockedIds } = useGraphStore();

  const currentBlock = getCurrentBlock();
  const progress = getProgress();
  const isLastSlide = currentSlideIndex === totalSlides - 1;

  const concept = useMemo(
    () => concepts.find((c) => c.id === activeLessonConceptId),
    [concepts, activeLessonConceptId]
  );

  const domainColor = concept ? DOMAIN_COLORS[concept.domain] : "#06b6d4";

  // Track direction for slide animation
  const direction = useMemo(() => {
    // We store the previous index to determine direction 
    return 1; // Default forward
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isLessonActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && canAdvance()) {
        if (isLastSlide) {
          handleComplete();
        } else {
          nextSlide();
        }
      } else if (e.key === "ArrowLeft") {
        prevSlide();
      } else if (e.key === "Escape") {
        exitLesson();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLessonActive, canAdvance, isLastSlide]);

  const handleComplete = useCallback(() => {
    completeLesson();
    if (activeLessonConceptId) {
      updateProgress(activeLessonConceptId, "mastered");
    }
  }, [completeLesson, activeLessonConceptId, updateProgress]);

  const handleExit = useCallback(() => {
    exitLesson();
  }, [exitLesson]);

  // Elapsed time display
  const elapsedSeconds = startedAt
    ? Math.floor((Date.now() - startedAt) / 1000)
    : 0;
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!isLessonActive || !activeLesson) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black"
    >

      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-4">
            <button
              onClick={handleExit}
              className="flex items-center gap-2 text-white/35 hover:text-white/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="h-5 w-px bg-white/10" />
            {concept && (
              <Badge
                variant="outline"
                className="text-xs"
                style={{
                  color: domainColor,
                  borderColor: `${domainColor}40`,
                }}
              >
                {DOMAIN_LABELS[concept.domain]}
              </Badge>
            )}
            <span className="text-sm font-semibold text-white/80">
              {activeLesson.title}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-white/35">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(elapsedSeconds)}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/35">
                {currentSlideIndex + 1} / {totalSlides}
              </span>
              <div className="w-32">
                <Progress
                  value={progress * 100}
                  className="h-1.5"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Slide area */}
        <div className="flex-1 flex items-center justify-center overflow-hidden px-6">
          <AnimatePresence mode="wait" custom={direction}>
            {!isLessonComplete ? (
              <motion.div
                key={currentSlideIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                  scale: { duration: 0.2 },
                }}
                className="w-full max-w-2xl"
              >
                <div className="bg-black border border-white/8 rounded-2xl p-8">
                  {currentBlock && (
                    <LessonBlockRenderer block={currentBlock} />
                  )}
                </div>
              </motion.div>
            ) : (
              /* Elegant "Slow Dopamine" Completion Screen */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-lg text-center space-y-8 relative"
              >
                {/* Ambient glow rings */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute rounded-full"
                      style={{
                        border: `1px solid ${domainColor}`,
                        width: 100 + i * 80,
                        height: 100 + i * 80,
                      }}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{
                        opacity: [0, 0.15, 0],
                        scale: [0.8, 1.2, 1.6],
                      }}
                      transition={{
                        duration: 3,
                        delay: i * 0.4,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                    />
                  ))}
                </div>

                {/* Trophy icon — slow, elegant pulse */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 150,
                    damping: 15,
                    delay: 0.2,
                  }}
                  className="relative"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <Trophy
                      className="w-14 h-14 mx-auto"
                      style={{ color: domainColor }}
                    />
                  </motion.div>
                </motion.div>

                {/* Title with staggered reveal */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="space-y-2"
                >
                  <h2 className="text-2xl font-bold text-white text-glow-subtle">
                    Concept Mastered
                  </h2>
                  <p className="text-white/50">
                    You&apos;ve completed{" "}
                    <span
                      className="font-medium"
                      style={{ color: domainColor }}
                    >
                      {activeLesson.title}
                    </span>
                  </p>
                </motion.div>

                {/* Stats grid — staggered entry */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="grid grid-cols-4 gap-2"
                >
                  {[
                    {
                      icon: Clock,
                      value: formatTime(elapsedSeconds),
                      label: "Time",
                    },
                    {
                      icon: Target,
                      value: String(totalSlides),
                      label: "Steps",
                    },
                    {
                      icon: Brain,
                      value: (() => {
                        const sessions =
                          useTelemetryStore.getState().completedSessions;
                        const last = sessions[sessions.length - 1];
                        return last
                          ? `${Math.round(last.productiveStruggleScore * 100)}%`
                          : "—";
                      })(),
                      label: "Focus",
                    },
                    {
                      icon: Zap,
                      value: (() => {
                        const sessions =
                          useTelemetryStore.getState().completedSessions;
                        const last = sessions[sessions.length - 1];
                        return last
                          ? String(
                              last.slideEvents.reduce(
                                (s, e) => s + e.interactions,
                                0
                              )
                            )
                          : "0";
                      })(),
                      label: "Interactions",
                    },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9 + i * 0.1 }}
                      className="bg-white/5 rounded-xl p-3 space-y-1 border border-white/8"
                    >
                      <stat.icon className="w-3.5 h-3.5 text-white/30 mx-auto" />
                      <div className="text-base font-bold text-white/90 font-mono">
                        {stat.value}
                      </div>
                      <div className="text-[9px] text-white/30 uppercase tracking-wider">
                        {stat.label}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Newly unlocked concepts — bridge notification */}
                {recentlyUnlockedIds.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.4, duration: 0.5 }}
                    className="bg-white/3 border border-white/10 rounded-xl px-4 py-3 space-y-2"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4 text-white/50" />
                      <span className="text-xs font-semibold text-white/60">
                        New Paths Unlocked
                      </span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {recentlyUnlockedIds.map((uid, i) => {
                        const unlocked = concepts.find((c) => c.id === uid);
                        if (!unlocked) return null;
                        return (
                          <motion.div
                            key={uid}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                              delay: 1.6 + i * 0.15,
                              type: "spring",
                              stiffness: 200,
                            }}
                          >
                            <Badge
                              variant="outline"
                              className="text-xs px-2.5 py-1"
                              style={{
                                color:
                                  DOMAIN_COLORS[unlocked.domain],
                                borderColor: `${DOMAIN_COLORS[unlocked.domain]}40`,
                              }}
                            >
                              {unlocked.title}
                            </Badge>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Return button — delayed entry */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.6 }}
                >
                  <Button
                    onClick={handleExit}
                    className="w-full font-semibold bg-white text-black hover:bg-white/90"
                  >
                    Return to Constellation
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom navigation */}
        {!isLessonComplete && (
          <footer className="flex items-center justify-between px-6 py-4 border-t border-white/8">
            {/* Slide dots */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === currentSlideIndex
                      ? "w-6 rounded-full"
                      : i < currentSlideIndex
                      ? "opacity-60"
                      : "opacity-30"
                  }`}
                  style={{
                    backgroundColor:
                      i <= currentSlideIndex ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.12)",
                  }}
                />
              ))}
            </div>

            {/* Nav buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={prevSlide}
                variant="ghost"
                size="sm"
                disabled={currentSlideIndex === 0}
                className="text-white/35 hover:text-white/70 disabled:opacity-30"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>

              {isLastSlide ? (
                <Button
                  onClick={handleComplete}
                  size="sm"
                  disabled={!canAdvance()}
                  className="font-semibold bg-white text-black hover:bg-white/90 disabled:opacity-40"
                >
                  <Trophy className="w-4 h-4 mr-1.5" />
                  Complete
                </Button>
              ) : (
                <Button
                  onClick={nextSlide}
                  size="sm"
                  disabled={!canAdvance()}
                  className="font-semibold bg-white text-black hover:bg-white/90 disabled:opacity-40"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              )}
            </div>
          </footer>
        )}
      </div>

      {/* Socratic AI Tutor overlay */}
      <SocraticChat />
    </motion.div>
  );
}
