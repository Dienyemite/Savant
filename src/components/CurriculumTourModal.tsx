"use client";

/**
 * CurriculumTourModal
 *
 * Three-step flow shown after a new notebook is created:
 *   1. Offer   — invite user to start a full curriculum tour
 *   2. Planning — spinner while AI plans the curriculum (~3s)
 *   3. Preview  — ordered topic list + "Begin Learning" button
 *
 * On "Begin Learning":
 *   - Pages are already created (API call happened in step 2)
 *   - Calls onStart(pages) so the dashboard can kick off background generation
 *     and navigate to page 1
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, BookOpen, Lock, ChevronRight } from "lucide-react";
import type { Notebook, Page } from "@/types";

type Step = "offer" | "planning" | "preview";

interface Props {
  notebook: Notebook;
  onSkip: () => void;
  onStart: (pages: Page[]) => void;
}

export default function CurriculumTourModal({ notebook, onSkip, onStart }: Props) {
  const [step, setStep] = useState<Step>("offer");
  const [pages, setPages] = useState<Page[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleBeginPlanning() {
    setStep("planning");
    setError(null);

    try {
      const res = await fetch(`/api/notebooks/${notebook.id}/curriculum-tour`, {
        method: "POST",
      });
      const data = (await res.json()) as { pages?: Page[]; error?: string };

      if (!res.ok || !data.pages) {
        setError(data.error ?? "Failed to plan curriculum. Please try again.");
        setStep("offer");
        return;
      }

      setPages(data.pages);
      setStep("preview");
    } catch {
      setError("Network error. Please try again.");
      setStep("offer");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={step === "offer" ? onSkip : undefined} />

      <motion.div
        className="relative bg-black border border-white/20 w-full max-w-md shadow-2xl overflow-hidden"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Corner decoration */}
        <div className="absolute top-0 right-0 w-24 h-24 border-l border-b border-white/10 pointer-events-none" />

        <AnimatePresence mode="wait">
          {step === "offer" && (
            <motion.div
              key="offer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-10"
            >
              <button
                onClick={onSkip}
                className="absolute top-6 right-6 text-white/30 hover:text-white cursor-none transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
                  <motion.div
                    className="absolute inset-0 rounded-full border border-white/30"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  />
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-xl italic font-light text-white tracking-wide">
                  Curriculum Tour
                </h2>
              </div>

              <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 leading-loose mb-3">
                Start a complete guided course
              </p>
              <p className="text-sm text-white/80 leading-relaxed mb-2">
                Savant will plan a full semester of{" "}
                <span className="italic text-white">{notebook.subject}</span> — 10–14
                topics, each with an interactive lesson grounded in the textbook.
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 leading-loose mb-10">
                Pages unlock sequentially as you complete each lesson.
                Socratic tutor, stylus, and annotations available throughout.
              </p>

              {error && (
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/50 mb-6">
                  {error}
                </p>
              )}

              <div className="flex gap-4">
                <button
                  onClick={onSkip}
                  className="flex-1 py-3 border border-white/20 text-[10px] uppercase tracking-[0.3em] text-white/60 hover:text-white hover:border-white/50 transition-colors cursor-none"
                >
                  Skip
                </button>
                <button
                  onClick={handleBeginPlanning}
                  className="flex-1 py-3 bg-white text-black text-[10px] uppercase tracking-[0.3em] hover:bg-white/90 transition-colors flex items-center justify-center gap-2 cursor-none"
                >
                  Plan My Course
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}

          {step === "planning" && (
            <motion.div
              key="planning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-10 flex flex-col items-center text-center py-16"
            >
              <div className="relative w-16 h-16 mb-10 flex items-center justify-center">
                <motion.div
                  className="absolute inset-0 rounded-full border border-white/20"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-2 rounded-full border border-dashed border-white/40"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                />
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/60 mb-3">
                Planning Curriculum
              </p>
              <p className="text-sm italic text-white/40">
                Designing your {notebook.subject} course…
              </p>
            </motion.div>
          )}

          {step === "preview" && (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-10"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl italic font-light text-white tracking-wide">
                  Your Course
                </h2>
                <span className="text-[9px] uppercase tracking-[0.3em] text-white/40">
                  {pages.length} Topics
                </span>
              </div>

              <div className="flex flex-col gap-0 mb-10 max-h-72 overflow-y-auto border border-white/10">
                {pages.map((page, i) => (
                  <div
                    key={page.id}
                    className="flex items-center gap-6 px-6 py-4 border-b border-white/5 last:border-b-0"
                  >
                    <span className="text-[9px] uppercase tracking-[0.3em] text-white/30 w-6 flex-shrink-0 text-right">
                      {i + 1}
                    </span>
                    <span className="text-[10px] text-white/80 flex-1 truncate">
                      {page.title}
                    </span>
                    {i > 0 && (
                      <Lock className="w-3 h-3 text-white/20 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 mb-8">
                Lessons will generate in the background — page 1 will be ready first.
              </p>

              <button
                onClick={() => onStart(pages)}
                className="w-full py-3 bg-white text-black text-[10px] uppercase tracking-[0.3em] hover:bg-white/90 transition-colors flex items-center justify-center gap-2 cursor-none"
              >
                Begin Learning
                <ChevronRight className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
