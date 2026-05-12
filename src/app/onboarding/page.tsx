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
import { useAuth } from "@/components/AuthProvider";
import { supabaseBrowser } from "@/lib/supabase";

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
  const { user, signOut } = useAuth();

  // ── Auth form state ──
  const [authTab, setAuthTab] = useState<"sign-up" | "sign-in">("sign-up");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authError, setAuthError] = useState<{ field: string; message: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // ── Path form state ──
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

  // Validate and submit sign-up form
  const handleSignUp = async () => {
    setAuthError(null);
    if (!authEmail.includes("@")) {
      setAuthError({ field: "email", message: "Enter a valid email address." });
      return;
    }
    if (authPassword.length < 8) {
      setAuthError({ field: "password", message: "Password must be at least 8 characters." });
      return;
    }
    setAuthLoading(true);
    const { data, error } = await supabaseBrowser.auth.signUp({
      email: authEmail,
      password: authPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        data: { display_name: authDisplayName.trim() || authEmail.split("@")[0] },
      },
    });
    if (!error && data.user) {
      // Persist profile row (fire-and-forget, don't block navigation)
      fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
          display_name: authDisplayName.trim() || undefined,
          _profile_only: true,
        }),
      }).catch(() => {});
    }
    setAuthLoading(false);
    if (error) {
      setAuthError({ field: "form", message: error.message });
    }
    // On success AuthProvider.onAuthStateChange fires; no further action needed here
  };

  // Validate and submit sign-in form
  const handleSignIn = async () => {
    setAuthError(null);
    if (!authEmail.includes("@")) {
      setAuthError({ field: "email", message: "Enter a valid email address." });
      return;
    }
    if (!authPassword) {
      setAuthError({ field: "password", message: "Enter your password." });
      return;
    }
    setAuthLoading(true);
    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
    setAuthLoading(false);
    if (error) {
      setAuthError({ field: "form", message: error.message });
    } else {
      router.push("/figma-dashboard");
    }
  };

  const handleForgotPassword = async () => {
    setAuthError(null);
    if (!authEmail.includes("@")) {
      setAuthError({ field: "email", message: "Enter your email address first." });
      return;
    }
    setAuthLoading(true);
    await supabaseBrowser.auth.resetPasswordForEmail(authEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setAuthLoading(false);
    setForgotSent(true);
  };

  const handleBegin = async () => {
    const learning_mode =
      selectedPath === "k12" ? "k12" :
      selectedPath === "college" ? "college" :
      "self_taught";

    const declared_subject =
      selectedPath === "college" ? major.trim() :
      selectedPath === "self" ? subject.trim() :
      null;

    // Persist learning profile to the DB if signed in
    if (user) {
      await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learning_mode,
          declared_subject: declared_subject ?? undefined,
          grade_level: selectedPath === "k12" ? grade : undefined,
        }),
      });
    }

    router.push("/figma-dashboard");
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

        {/* ── Auth section ── */}
        {user ? (
          /* Already signed in — show account status */
          <div
            className="border border-white/[0.06] px-4 py-3 flex items-center justify-between"
          >
            <div>
              <p
                className="text-[10px] tracking-widest uppercase text-white/20"
                style={{ fontFamily: "'Courier New', monospace" }}
              >
                Signed in as
              </p>
              <p className="text-sm text-white/60 mt-0.5">{user.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="text-[10px] tracking-widest uppercase text-white/20 hover:text-white/50 transition-colors"
              style={{ fontFamily: "'Courier New', monospace" }}
            >
              Sign out
            </button>
          </div>
        ) : (
          /* Auth form — sign-up / sign-in tabs */
          <div className="border border-white/[0.06]">
            {/* Tabs */}
            <div className="flex border-b border-white/[0.06]">
              {(["sign-up", "sign-in"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setAuthTab(tab); setAuthError(null); setForgotMode(false); setForgotSent(false); }}
                  className={`flex-1 px-4 py-3 text-[10px] tracking-widest uppercase transition-colors text-left ${
                    authTab === tab
                      ? "text-white/60 border-b border-white/30 -mb-px"
                      : "text-white/20 hover:text-white/40"
                  }`}
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  {tab === "sign-up" ? "New notebook" : "Return to notebook"}
                </button>
              ))}
            </div>

            {/* Fields */}
            <div className="px-4 py-4 space-y-0">
              {/* Email */}
              <div className="flex items-center gap-3 border-b border-white/10 pb-2 mb-3 focus-within:border-white/30 transition-colors">
                <span
                  className="text-[10px] tracking-widest uppercase text-white/25 w-20 flex-shrink-0"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  Email
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white/70 placeholder-white/20 outline-none"
                  style={{ fontFamily: "'Courier New', monospace" }}
                  placeholder="you@example.com"
                />
              </div>
              {authError?.field === "email" && (
                <p
                  className="text-[10px] text-white/40 mb-3 -mt-1"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  ↳ {authError.message}
                </p>
              )}

              {/* Password */}
              <div className="flex items-center gap-3 border-b border-white/10 pb-2 mb-3 focus-within:border-white/30 transition-colors">
                <span
                  className="text-[10px] tracking-widest uppercase text-white/25 w-20 flex-shrink-0"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  Password
                </span>
                <input
                  type="password"
                  autoComplete={authTab === "sign-up" ? "new-password" : "current-password"}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white/70 placeholder-white/20 outline-none"
                  style={{ fontFamily: "'Courier New', monospace" }}
                  placeholder="min. 8 characters"
                />
              </div>
              {authError?.field === "password" && (
                <p
                  className="text-[10px] text-white/40 mb-3 -mt-1"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  ↳ {authError.message}
                </p>
              )}

              {/* Display name (sign-up only) */}
              <AnimatePresence>
                {authTab === "sign-up" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-3 border-b border-white/10 pb-2 mb-3 focus-within:border-white/30 transition-colors">
                      <span
                        className="text-[10px] tracking-widest uppercase text-white/25 w-20 flex-shrink-0"
                        style={{ fontFamily: "'Courier New', monospace" }}
                      >
                        Name
                      </span>
                      <input
                        type="text"
                        autoComplete="name"
                        value={authDisplayName}
                        onChange={(e) => setAuthDisplayName(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-white/70 placeholder-white/20 outline-none"
                        style={{ fontFamily: "'Courier New', monospace" }}
                        placeholder="How should Savant address you?"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form-level error */}
              {authError?.field === "form" && (
                <p
                  className="text-[10px] text-white/40 mb-3"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  ↳ {authError.message}
                </p>
              )}

              {/* Forgot password (sign-in tab only) */}
              {authTab === "sign-in" && !forgotMode && (
                <button
                  type="button"
                  onClick={() => { setForgotMode(true); setForgotSent(false); setAuthError(null); }}
                  className="text-[10px] tracking-widest uppercase text-white/20 hover:text-white/40 transition-colors mt-1 block"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  Forgot password?
                </button>
              )}

              {/* Forgot password form */}
              {authTab === "sign-in" && forgotMode && (
                <div className="mt-2 space-y-2">
                  {forgotSent ? (
                    <p className="text-[10px] text-white/40" style={{ fontFamily: "'Courier New', monospace" }}>
                      ↳ Reset link sent — check your email.
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={authLoading}
                      className="text-[10px] tracking-[0.22em] uppercase text-white/45 hover:text-white/80 disabled:text-white/20 transition-colors flex items-center gap-1.5 border-b border-white/10 hover:border-white/30 pb-px"
                      style={{ fontFamily: "'Courier New', monospace" }}
                    >
                      {authLoading ? "…" : "Send reset link →"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setForgotMode(false); setForgotSent(false); }}
                    className="text-[10px] tracking-widest uppercase text-white/20 hover:text-white/40 transition-colors block"
                    style={{ fontFamily: "'Courier New', monospace" }}
                  >
                    ← Back to sign in
                  </button>
                </div>
              )}

              {/* Submit */}
              {!forgotMode && (
                <button
                  onClick={authTab === "sign-up" ? handleSignUp : handleSignIn}
                  disabled={authLoading}
                  className="text-[10px] tracking-[0.22em] uppercase text-white/45 hover:text-white/80 disabled:text-white/20 transition-colors flex items-center gap-1.5 border-b border-white/10 hover:border-white/30 pb-px mt-2"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  {authLoading
                    ? "…"
                    : authTab === "sign-up"
                    ? "Open new notebook →"
                    : "Return to notebook →"}
                </button>
              )}
            </div>
          </div>
        )}

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
