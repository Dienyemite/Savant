"use client";

import { useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useLessonStore } from "@/store/lesson-store";
import { useGraphStore } from "@/store/graph-store";
import { useTelemetryStore } from "@/store/telemetry-store";
import { DOMAIN_COLORS, DOMAIN_LABELS } from "@/types";
import LessonBlockRenderer from "./LessonBlockRenderer";
import {
  ArrowLeft,
  ArrowRight,
  X,
  Trophy,
  Sparkles,
  Clock,
  Brain,
  Target,
  Zap,
} from "lucide-react";
import SocraticChat from "./SocraticChat";

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
