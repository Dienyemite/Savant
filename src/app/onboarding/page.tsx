"use client";

/**
 * Onboarding — The entry point for new learners.
 *
 * Three paths, styled as a notebook index page:
 *
 *   I.  Self-Learning  — type any subject you want to learn
 *   II. K-12           — select grade level, begin diagnostic
 *   III. College       — enter major, get curated curriculum
 *
 * Each path choice looks like a hand-written entry in a ledger.
 * Selecting a path reveals an inline sub-form on the same page.
 * Strict monochrome notebook aesthetic throughout.
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

type Path = "self" | "k12" | "college" | null;

const GRADE_LABELS: Record<number, string> = {
  1: "Grade 1",
  2: "Grade 2",
  3: "Grade 3",
  4: "Grade 4",
  5: "Grade 5",
  6: "Grade 6",
  7: "Grade 7",
  8: "Grade 8",
  9: "Grade 9 (Freshman)",
  10: "Grade 10 (Sophomore)",
  11: "Grade 11 (Junior)",
  12: "Grade 12 (Senior)",
};

const SAMPLE_MAJORS = [
  "Mathematics",
  "Computer Science",
  "Physics",
  "Biology",
  "Chemistry",
  "Philosophy",
  "Economics",
  "History",
  "Literature",
  "Psychology",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedPath, setSelectedPath] = useState<Path>(null);
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState<number | null>(null);
  const [major, setMajor] = useState("");
  const [majorQuery, setMajorQuery] = useState("");
  const [k12Step, setK12Step] = useState<"grade" | "diagnostic">("grade");
  const selfInputRef = useRef<HTMLInputElement>(null);
  const majorInputRef = useRef<HTMLInputElement>(null);

  // Focus input when path is selected
  useEffect(() => {
    if (selectedPath === "self") selfInputRef.current?.focus();
    if (selectedPath === "college") majorInputRef.current?.focus();
  }, [selectedPath]);

  const filteredMajors = SAMPLE_MAJORS.filter((m) =>
    m.toLowerCase().includes(majorQuery.toLowerCase())
  );

  const handleBegin = () => {
    // Persist selections to sessionStorage so page.tsx can seed the graph.
    // Phase 6 will replace this with Supabase user metadata persistence.
    const prefs = {
      path: selectedPath ?? "self",
      gradeLevel: selectedPath === "k12" ? grade : null,
      major: selectedPath === "college" ? major.trim() : null,
      subject: subject.trim() || null,
    };
    sessionStorage.setItem("savant_onboarding", JSON.stringify(prefs));
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-black text-white notebook-ruled notebook-margin">
      <div className="max-w-xl mx-auto px-16 py-12 space-y-12">

        {/* ── Page header ── */}
        <header className="border-b border-white/[0.06] pb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[10px] tracking-widest uppercase text-white/20 hover:text-white/50 transition-colors mb-6"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </Link>
          <p
            className="text-[10px] tracking-[0.25em] uppercase text-white/20 mb-2"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            Savant — Onboarding
          </p>
          <h1 className="text-xl text-white/75">
            Choose Your Learning Path
          </h1>
          <p className="text-sm text-white/30 mt-2 leading-relaxed">
            Your choice shapes your initial Knowledge Constellation — the
            map of concepts you&apos;ll explore.
          </p>
        </header>

        {/* ── Path Index — notebook entries ── */}
        <div className="space-y-0 border border-white/[0.06]">

          {/* ── I. Self-Learning ── */}
          <PathEntry
            index="I"
            title="Self-Learning"
            subtitle="The Autodidact"
            description="Type any subject. Savant maps it to a prerequisite knowledge tree."
            selected={selectedPath === "self"}
            onSelect={() =>
              setSelectedPath(selectedPath === "self" ? null : "self")
            }
          >
            <AnimatePresence>
              {selectedPath === "self" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-5 pt-1 space-y-4">
                    <div
                      className="flex items-center gap-3 border-b border-white/10 pb-2 focus-within:border-white/30 transition-colors"
                    >
                      <span
                        className="text-[10px] tracking-widest uppercase text-white/25 flex-shrink-0"
                        style={{ fontFamily: "'Courier New', monospace" }}
                      >
                        Subject:
                      </span>
                      <input
                        ref={selfInputRef}
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Quantum Mechanics, Jazz Harmony, Linear Algebra…"
                        className="flex-1 bg-transparent text-sm text-white/70 placeholder-white/20 outline-none"
                        style={{ fontFamily: "'ivy-presto', serif" }}
                        onKeyDown={(e) => e.key === "Enter" && subject.trim() && handleBegin()}
                      />
                    </div>
                    {subject.trim() && (
                      <BeginButton onClick={handleBegin} />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </PathEntry>

          {/* ── II. K-12 ── */}
          <PathEntry
            index="II"
            title="K-12 Student"
            subtitle="The Structured Learner"
            description="Select your grade. A diagnostic test identifies gaps and builds your path."
            selected={selectedPath === "k12"}
            onSelect={() =>
              setSelectedPath(selectedPath === "k12" ? null : "k12")
            }
          >
            <AnimatePresence>
              {selectedPath === "k12" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-5 pt-1 space-y-4">
                    {k12Step === "grade" ? (
                      <>
                        <p
                          className="text-[10px] tracking-widest uppercase text-white/20"
                          style={{ fontFamily: "'Courier New', monospace" }}
                        >
                          Select Grade
                        </p>
                        <div className="grid grid-cols-4 gap-px border border-white/[0.06]">
                          {Object.entries(GRADE_LABELS).map(([g, label]) => (
                            <button
                              key={g}
                              onClick={() => setGrade(Number(g))}
                              className={`px-2 py-2.5 text-[10px] border-r border-white/[0.06] last:border-r-0 transition-colors ${
                                grade === Number(g)
                                  ? "text-white/80 bg-white/[0.04]"
                                  : "text-white/25 hover:text-white/50 hover:bg-white/[0.02]"
                              }`}
                              style={{ fontFamily: "'Courier New', monospace" }}
                            >
                              {label.split(" ")[1]}
                            </button>
                          ))}
                        </div>
                        {grade && (
                          <div className="space-y-2">
                            <p className="text-xs text-white/40">
                              <span className="text-white/60">
                                {GRADE_LABELS[grade]}
                              </span>{" "}
                              selected. A diagnostic will test{" "}
                              {GRADE_LABELS[grade - 1] ?? "foundational"}{" "}
                              concepts.
                            </p>
                            <button
                              onClick={() => setK12Step("diagnostic")}
                              className="text-[10px] tracking-widest uppercase text-white/30 hover:text-white/60 transition-colors flex items-center gap-1.5"
                              style={{ fontFamily: "'Courier New', monospace" }}
                            >
                              Begin Diagnostic
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-4">
                        <p
                          className="text-[10px] tracking-widest uppercase text-white/20"
                          style={{ fontFamily: "'Courier New', monospace" }}
                        >
                          Diagnostic Crucible — Grade {grade}
                        </p>
                        <div className="border border-white/[0.06] p-4 space-y-3">
                          <p className="text-sm text-white/50 leading-relaxed">
                            The diagnostic will illuminate specific nodes in
                            your Knowledge Constellation as either{" "}
                            <span className="text-white/70">Mastered</span> or{" "}
                            <span className="text-white/30 italic">Gap Identified</span>.
                            Your path will route through gaps first.
                          </p>
                          <p
                            className="text-[10px] text-white/20 italic"
                            style={{ fontFamily: "'Courier New', monospace" }}
                          >
                            Full diagnostic coming in next build.
                          </p>
                        </div>
                        <BeginButton onClick={handleBegin} label="Enter Constellation →" />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </PathEntry>

          {/* ── III. College ── */}
          <PathEntry
            index="III"
            title="College / Undergrad"
            subtitle="The Specialist"
            description="Enter your major. Savant surfaces the core curriculum most relevant to your field."
            selected={selectedPath === "college"}
            onSelect={() =>
              setSelectedPath(selectedPath === "college" ? null : "college")
            }
          >
            <AnimatePresence>
              {selectedPath === "college" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-5 pt-1 space-y-4">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-2 focus-within:border-white/30 transition-colors">
                      <span
                        className="text-[10px] tracking-widest uppercase text-white/25 flex-shrink-0"
                        style={{ fontFamily: "'Courier New', monospace" }}
                      >
                        Major:
                      </span>
                      <input
                        ref={majorInputRef}
                        type="text"
                        value={majorQuery}
                        onChange={(e) => {
                          setMajorQuery(e.target.value);
                          setMajor(e.target.value);
                        }}
                        placeholder="Mathematics, Computer Science, Physics…"
                        className="flex-1 bg-transparent text-sm text-white/70 placeholder-white/20 outline-none"
                        style={{ fontFamily: "'ivy-presto', serif" }}
                        onKeyDown={(e) =>
                          e.key === "Enter" && major.trim() && handleBegin()
                        }
                      />
                    </div>

                    {/* Autocomplete suggestions */}
                    {majorQuery.length > 0 && filteredMajors.length > 0 && (
                      <div className="border border-white/[0.06]">
                        {filteredMajors.slice(0, 5).map((m) => (
                          <button
                            key={m}
                            onClick={() => {
                              setMajor(m);
                              setMajorQuery(m);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.02] transition-colors border-b border-white/[0.04] last:border-b-0"
                            style={{ fontFamily: "'ivy-presto', serif" }}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}

                    {major.trim() && (
                      <BeginButton onClick={handleBegin} />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </PathEntry>
        </div>

        {/* ── Footer note ── */}
        <p
          className="text-[10px] text-white/15 text-center"
          style={{ fontFamily: "'Courier New', monospace" }}
        >
          You can always change paths from your settings.
        </p>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────
// PathEntry — a single row in the path index
// ─────────────────────────────────────────────
function PathEntry({
  index,
  title,
  subtitle,
  description,
  selected,
  onSelect,
  children,
}: {
  index: string;
  title: string;
  subtitle: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`border-b border-white/[0.06] last:border-b-0 transition-colors ${
        selected ? "bg-white/[0.015]" : ""
      }`}
    >
      <button
        onClick={onSelect}
        className="w-full text-left px-4 py-5 flex items-start gap-4 group"
      >
        <span
          className="flex-shrink-0 text-[10px] text-white/20 mt-0.5 w-8"
          style={{ fontFamily: "'Courier New', monospace" }}
        >
          {index}.
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <h2
              className={`text-sm transition-colors ${
                selected ? "text-white/80" : "text-white/50 group-hover:text-white/70"
              }`}
            >
              {title}
            </h2>
            <span
              className="text-[10px] text-white/20 italic"
              style={{ fontFamily: "'ivy-presto', serif" }}
            >
              {subtitle}
            </span>
          </div>
          <p className="text-[11px] text-white/25 leading-relaxed">
            {description}
          </p>
        </div>
        <motion.div
          animate={{ rotate: selected ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          className="text-white/20 mt-0.5"
        >
          <ArrowRight className="w-3 h-3" />
        </motion.div>
      </button>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// BeginButton — monochrome CTA
// ─────────────────────────────────────────────
function BeginButton({
  onClick,
  label = "Enter Constellation →",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="text-[10px] tracking-[0.22em] uppercase text-white/45 hover:text-white/80 transition-colors flex items-center gap-1.5 border-b border-white/10 hover:border-white/30 pb-px"
      style={{ fontFamily: "'Courier New', monospace" }}
    >
      {label}
    </button>
  );
}
