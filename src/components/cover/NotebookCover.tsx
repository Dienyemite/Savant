/**
 * NotebookCover.tsx — Phase 2: The Landing Page ("The Front Cover")
 *
 * "The viewport acts as the front cover of this notebook.
 *  It utilises the textured black background and glowing white text.
 *  The user is presented with the three core paths: Self-Learning,
 *  K-12, and College/Undergraduate.
 *  Once a subject is selected, a full-screen transition occurs,
 *  simulating opening the notebook."
 *
 * Rendered as a fixed full-screen overlay (z-50) on top of the canvas.
 * Dismissed with a Framer Motion page-turn animation (book opening).
 *
 * UI composition:
 *  • Notebook binding holes along the left edge
 *  • Centred title block: "Savant"
 *  • Path selector: Self-Learning / K-12 / College/Undergrad
 *  • Contextual sub-inputs (grade level / major)
 *  • Subject search with quick-pick suggestions
 *  • "Open Notebook →" button that triggers the transition
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCanvasStore } from "@/store/canvas-store";

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────

type LearningPath = "self" | "k12" | "college" | null;

const GRADE_LEVELS = [
  "Grade 1–2",
  "Grade 3–4",
  "Grade 5–6",
  "Grade 7–8",
  "Grade 9–10",
  "Grade 11–12",
];

const MAJORS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "History",
  "Economics",
  "Philosophy",
  "Literature",
  "Psychology",
];

const QUICK_SUBJECTS = [
  "Algebra",
  "Calculus",
  "Geometry",
  "Physics",
  "Chemistry",
];

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function NotebookCover() {
  const { closeCover } = useCanvasStore();

  const [selectedPath, setSelectedPath] = useState<LearningPath>(null);
  const [gradeLevel, setGradeLevel] = useState("");
  const [major, setMajor] = useState("");
  const [subject, setSubject] = useState("");
  const [isOpening, setIsOpening] = useState(false);

  const canOpen =
    subject.trim().length > 0 &&
    (selectedPath === "self" ||
      (selectedPath === "k12" && gradeLevel) ||
      (selectedPath === "college" && major) ||
      selectedPath === null);

  const handleOpen = () => {
    if (!canOpen) return;
    setIsOpening(true);
    // Allow the exit animation to complete before closing
    setTimeout(closeCover, 900);
  };

  const resetPath = () => {
    setSelectedPath(null);
    setSubject("");
    setGradeLevel("");
    setMajor("");
  };

  return (
    <AnimatePresence>
      {!isOpening && (
        <motion.div
          key="notebook-cover"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            y: -60,
            scale: 0.97,
            rotateX: -6,
            transition: {
              duration: 0.85,
              ease: [0.4, 0, 0.2, 1],
            },
          }}
          className="fixed inset-0 z-50 bg-black notebook-ruled flex flex-col items-center justify-center"
          style={{ transformOrigin: "top center", transformStyle: "preserve-3d" }}
        >
          {/* ── Binding spine — left edge with ring holes ── */}
          <div className="absolute left-0 top-0 bottom-0 w-9 border-r border-white/[0.06] flex flex-col items-center justify-center gap-4 py-10">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full border border-white/[0.12]"
              />
            ))}
          </div>

          {/* ── Right page number ── */}
          <p
            className="absolute bottom-6 right-10 text-[9px] tracking-[0.4em] text-white/15"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            pg. 0001
          </p>

          {/* ── Cover content ── */}
          <div className="flex flex-col items-center gap-12 w-full max-w-[420px] px-6">

            {/* Title block */}
            <div className="text-center space-y-3">
              <p
                className="text-[10px] tracking-[0.55em] uppercase text-white/20"
                style={{ fontFamily: "'Courier New', monospace" }}
              >
                An Endless Monochrome Notebook
              </p>
              <h1
                className="text-6xl font-semibold tracking-tight text-white text-glow leading-none"
                style={{ fontFamily: "'ivy-presto', serif" }}
              >
                Savant
              </h1>
              <p
                className="text-[11px] tracking-[0.3em] uppercase text-white/25"
                style={{ fontFamily: "'Courier New', monospace" }}
              >
                Deep Learning for Young Minds
              </p>
            </div>

            {/* ── Path selection / input forms ── */}
            <div className="w-full">
              <AnimatePresence mode="wait">
                {/* Step 1: Choose a learning path */}
                {!selectedPath && (
                  <motion.div
                    key="path-select"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <p
                      className="text-[9px] tracking-[0.42em] uppercase text-white/18 text-center mb-4"
                      style={{ fontFamily: "'Courier New', monospace" }}
                    >
                      Choose your path
                    </p>

                    {(
                      [
                        {
                          id: "self" as const,
                          label: "Self-Learning",
                          sub: "Learn anything, at your own pace",
                        },
                        {
                          id: "k12" as const,
                          label: "K–12",
                          sub: "Elementary to High School",
                        },
                        {
                          id: "college" as const,
                          label: "College / Undergrad",
                          sub: "University-level curriculum",
                        },
                      ] as const
                    ).map((path) => (
                      <button
                        key={path.id}
                        onClick={() => setSelectedPath(path.id)}
                        className="w-full group flex items-center justify-between px-5 py-3.5 border border-white/[0.08] hover:border-white/25 hover:bg-white/[0.025] transition-all"
                      >
                        <span
                          className="text-[13px] text-white/55 group-hover:text-white/85 transition-colors"
                          style={{ fontFamily: "'ivy-presto', serif" }}
                        >
                          {path.label}
                        </span>
                        <span
                          className="text-[9px] tracking-widest uppercase text-white/18 group-hover:text-white/35 transition-colors"
                          style={{ fontFamily: "'Courier New', monospace" }}
                        >
                          {path.sub}
                        </span>
                      </button>
                    ))}

                    {/* Quick entry — skip path selection */}
                    <div className="pt-2">
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleOpen();
                        }}
                        placeholder="or just type a subject to jump in →"
                        className="w-full bg-transparent border-b border-white/[0.08] focus:border-white/25 outline-none py-2 text-[12px] text-white/55 placeholder-white/15 transition-colors text-center"
                        style={{ fontFamily: "'ivy-presto', serif" }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Sub-form based on path */}
                {selectedPath && (
                  <motion.div
                    key="sub-form"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    {/* Back link */}
                    <button
                      onClick={resetPath}
                      className="text-[9px] tracking-widest uppercase text-white/20 hover:text-white/45 transition-colors"
                      style={{ fontFamily: "'Courier New', monospace" }}
                    >
                      ← Back
                    </button>

                    {/* K-12: Grade level */}
                    {selectedPath === "k12" && (
                      <div>
                        <p
                          className="text-[9px] tracking-[0.4em] uppercase text-white/18 mb-2"
                          style={{ fontFamily: "'Courier New', monospace" }}
                        >
                          Grade Level
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {GRADE_LEVELS.map((g) => (
                            <button
                              key={g}
                              onClick={() => setGradeLevel(g)}
                              className={`py-2 text-[10px] tracking-wide border transition-all ${
                                gradeLevel === g
                                  ? "border-white/35 text-white/75 bg-white/[0.05]"
                                  : "border-white/[0.07] text-white/28 hover:border-white/22 hover:text-white/50"
                              }`}
                              style={{ fontFamily: "'Courier New', monospace" }}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* College: Major */}
                    {selectedPath === "college" && (
                      <div>
                        <p
                          className="text-[9px] tracking-[0.4em] uppercase text-white/18 mb-2"
                          style={{ fontFamily: "'Courier New', monospace" }}
                        >
                          Field of Study
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {MAJORS.map((m) => (
                            <button
                              key={m}
                              onClick={() => setMajor(m)}
                              className={`px-3 py-1.5 text-[10px] tracking-wide border transition-all ${
                                major === m
                                  ? "border-white/35 text-white/75 bg-white/[0.05]"
                                  : "border-white/[0.07] text-white/28 hover:border-white/22 hover:text-white/50"
                              }`}
                              style={{ fontFamily: "'Courier New', monospace" }}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Subject search */}
                    <div>
                      <p
                        className="text-[9px] tracking-[0.4em] uppercase text-white/18 mb-2"
                        style={{ fontFamily: "'Courier New', monospace" }}
                      >
                        {selectedPath === "self"
                          ? "What do you want to learn?"
                          : "Subject"}
                      </p>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleOpen();
                        }}
                        placeholder={
                          selectedPath === "college"
                            ? "e.g. Differential Equations, Thermodynamics"
                            : "e.g. Algebra, Photosynthesis, Roman History"
                        }
                        className="w-full bg-transparent border border-white/[0.08] focus:border-white/30 outline-none px-4 py-3 text-[13px] text-white/65 placeholder-white/15 transition-colors"
                        style={{ fontFamily: "'ivy-presto', serif" }}
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                      />
                      {/* Quick suggestions */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {QUICK_SUBJECTS.map((s) => (
                          <button
                            key={s}
                            onClick={() => setSubject(s)}
                            className="text-[9px] tracking-wider text-white/15 hover:text-white/38 transition-colors"
                            style={{ fontFamily: "'Courier New', monospace" }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Open notebook */}
                    <button
                      onClick={handleOpen}
                      disabled={!canOpen}
                      className="w-full py-3 border border-white/15 text-white/55 hover:text-white/85 hover:border-white/35 hover:bg-white/[0.025] disabled:opacity-20 disabled:cursor-not-allowed transition-all text-[11px] tracking-[0.35em] uppercase mt-2"
                      style={{ fontFamily: "'Courier New', monospace" }}
                    >
                      Open Notebook →
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Decorative bottom rule ── */}
          <div className="absolute bottom-14 left-20 right-10 h-px bg-white/[0.05]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
