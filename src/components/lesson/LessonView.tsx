"use client";

import { useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useLessonStore } from "@/store/lesson-store";
import { useGraphStore } from "@/store/graph-store";
import { DOMAIN_COLORS, DOMAIN_LABELS } from "@/types";
import LessonBlockRenderer from "./LessonBlockRenderer";
import {
  ArrowLeft,
  ArrowRight,
  X,
  Trophy,
  Sparkles,
  Clock,
} from "lucide-react";

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

  const { updateProgress, concepts } = useGraphStore();

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
      className="fixed inset-0 z-50 bg-[#0a0e1a]"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0a0e1a] to-slate-950" />

      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50">
          <div className="flex items-center gap-4">
            <button
              onClick={handleExit}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="h-5 w-px bg-slate-800" />
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
            <span className="text-sm font-semibold text-slate-200">
              {activeLesson.title}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(elapsedSeconds)}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {currentSlideIndex + 1} / {totalSlides}
              </span>
              <div className="w-32">
                <Progress
                  value={progress * 100}
                  className="h-1.5 bg-slate-800"
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
                <div className="bg-slate-900/60 border border-slate-800/50 rounded-2xl p-8 backdrop-blur-sm">
                  {currentBlock && (
                    <LessonBlockRenderer block={currentBlock} />
                  )}
                </div>
              </motion.div>
            ) : (
              /* Completion screen */
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="w-full max-w-md text-center space-y-6"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                >
                  <Trophy
                    className="w-16 h-16 mx-auto"
                    style={{ color: domainColor }}
                  />
                </motion.div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-slate-100">
                    Concept Mastered
                  </h2>
                  <p className="text-slate-400">
                    You&apos;ve completed{" "}
                    <span className="text-slate-200 font-medium">
                      {activeLesson.title}
                    </span>
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 rounded-xl p-3 space-y-1">
                    <Clock className="w-4 h-4 text-slate-500 mx-auto" />
                    <div className="text-lg font-bold text-slate-200 font-mono">
                      {formatTime(elapsedSeconds)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase">
                      Time Spent
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-3 space-y-1">
                    <Sparkles className="w-4 h-4 text-slate-500 mx-auto" />
                    <div className="text-lg font-bold text-slate-200">
                      {totalSlides}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase">
                      Steps Completed
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleExit}
                  className="w-full font-semibold"
                  style={{
                    backgroundColor: domainColor,
                    color: "#0f172a",
                  }}
                >
                  Return to Constellation
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom navigation */}
        {!isLessonComplete && (
          <footer className="flex items-center justify-between px-6 py-4 border-t border-slate-800/50">
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
                      i <= currentSlideIndex ? domainColor : "#334155",
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
                className="text-slate-400 hover:text-slate-200 disabled:opacity-30"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>

              {isLastSlide ? (
                <Button
                  onClick={handleComplete}
                  size="sm"
                  disabled={!canAdvance()}
                  className="font-semibold disabled:opacity-40"
                  style={{
                    backgroundColor: canAdvance() ? domainColor : undefined,
                    color: canAdvance() ? "#0f172a" : undefined,
                  }}
                >
                  <Trophy className="w-4 h-4 mr-1.5" />
                  Complete
                </Button>
              ) : (
                <Button
                  onClick={nextSlide}
                  size="sm"
                  disabled={!canAdvance()}
                  className="font-semibold disabled:opacity-40"
                  style={{
                    backgroundColor: canAdvance() ? domainColor : undefined,
                    color: canAdvance() ? "#0f172a" : undefined,
                  }}
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              )}
            </div>
          </footer>
        )}
      </div>
    </motion.div>
  );
}
