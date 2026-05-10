"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useTelemetryStore } from "@/store/telemetry-store";
import { useGraphStore } from "@/store/graph-store";
import { DOMAIN_LABELS, type ConceptDomain } from "@/types";
import { ArrowLeft, Clock, Target, Zap, Brain } from "lucide-react";

// ════════════════════════════════════════════════════════════
// Analytics Dashboard — Notebook ledger style.
// Flat ruled rows. No rounded cards. Strict monochrome.
// ════════════════════════════════════════════════════════════

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function StruggleRule({ score }: { score: number }) {
  const label =
    score >= 0.7 ? "Deep Focus"
    : score >= 0.4 ? "Engaged"
    : score > 0 ? "Surface"
    : "No data";

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 h-px bg-white/[0.07] relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score * 100}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="absolute left-0 top-0 h-full"
          style={{
            background:
              score >= 0.7 ? "rgba(255,255,255,0.75)"
              : score >= 0.4 ? "rgba(255,255,255,0.4)"
              : "rgba(255,255,255,0.15)",
          }}
        />
      </div>
      <span
        className="text-[10px] text-white/25 w-20 text-right"
        style={{ fontFamily: "'Courier New', monospace" }}
      >
        {label}
      </span>
    </div>
  );
}

export default function TeacherDashboard() {
  const { completedSessions, getConceptMetrics, getAllMetrics } =
    useTelemetryStore();
  const { concepts, progressMap } = useGraphStore();
  const overall = getAllMetrics();

  const masteredCount = Array.from(progressMap.values()).filter(
    (s) => s === "mastered"
  ).length;
  const unlockedCount = Array.from(progressMap.values()).filter(
    (s) => s === "unlocked"
  ).length;

  const conceptMetrics = useMemo(() => {
    const conceptIds = new Set(completedSessions.map((s) => s.conceptId));
    return Array.from(conceptIds).map((cId) => {
      const concept = concepts.find((c) => c.id === cId);
      const metrics = getConceptMetrics(cId);
      return { concept, metrics };
    });
  }, [completedSessions, concepts, getConceptMetrics]);

  const domainStats = useMemo(() => {
    const domains: Record<
      string,
      { count: number; mastered: number; time: number; struggle: number }
    > = {};
    for (const c of concepts) {
      if (!domains[c.domain])
        domains[c.domain] = { count: 0, mastered: 0, time: 0, struggle: 0 };
      domains[c.domain].count++;
      if (progressMap.get(c.id) === "mastered") domains[c.domain].mastered++;
    }
    for (const session of completedSessions) {
      const concept = concepts.find((c) => c.id === session.conceptId);
      if (concept && domains[concept.domain]) {
        domains[concept.domain].time += session.totalTimeSeconds;
        domains[concept.domain].struggle += session.productiveStruggleScore;
      }
    }
    return Object.entries(domains).map(([domain, stats]) => ({
      domain: domain as ConceptDomain,
      ...stats,
      avgStruggle: stats.mastered > 0 ? stats.struggle / stats.mastered : 0,
    }));
  }, [concepts, progressMap, completedSessions]);

  return (
    <main className="min-h-screen bg-black text-white notebook-ruled notebook-margin">
      <div className="max-w-3xl mx-auto px-16 py-10 space-y-12">

        {/* ── Page header ── */}
        <header className="border-b border-white/[0.06] pb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[10px] tracking-widest uppercase text-white/20 hover:text-white/50 transition-colors mb-6"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            <ArrowLeft className="w-3 h-3" />
            Constellation
          </Link>
          <p
            className="text-[10px] tracking-[0.25em] uppercase text-white/20 mb-1"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            II. Analytics
          </p>
          <h1 className="text-xl text-white/70">
            Productive Struggle Report
          </h1>
        </header>

        {/* ── Overview — four key figures ── */}
        <section>
          <p
            className="text-[9px] tracking-[0.22em] uppercase text-white/20 border-b border-white/[0.05] pb-2 mb-4"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            Overview
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px border border-white/[0.06]">
            {[
              {
                icon: Brain,
                value: String(overall.totalLessonsCompleted),
                label: "Lessons",
              },
              {
                icon: Clock,
                value: formatTime(overall.totalTimeSeconds),
                label: "Time",
              },
              {
                icon: Zap,
                value:
                  overall.averageStruggleScore > 0
                    ? `${Math.round(overall.averageStruggleScore * 100)}%`
                    : "—",
                label: "Avg Focus",
              },
              {
                icon: Target,
                value: String(overall.totalInteractions),
                label: "Interactions",
              },
            ].map((item) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 py-5 border-r border-white/[0.06] last:border-r-0 space-y-2"
              >
                <item.icon className="w-4 h-4 text-white/20" />
                <p
                  className="text-2xl text-white/70"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  {item.value}
                </p>
                <p
                  className="text-[9px] tracking-widest uppercase text-white/20"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  {item.label}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Knowledge progress ── */}
        <section className="space-y-4">
          <p
            className="text-[9px] tracking-[0.22em] uppercase text-white/20 border-b border-white/[0.05] pb-2"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            Knowledge Progress — {masteredCount}/{concepts.length}
          </p>
          {/* Overall ruled bar */}
          <div className="relative h-px bg-white/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(masteredCount / Math.max(concepts.length, 1)) * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute left-0 top-0 h-full bg-white/60"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${((masteredCount + unlockedCount) / Math.max(concepts.length, 1)) * 100}%`,
              }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute left-0 top-0 h-full bg-white/20"
            />
          </div>
          <div
            className="flex justify-between text-[10px] text-white/25"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            <span>{masteredCount} mastered · {unlockedCount} in progress</span>
            <span>{concepts.length - masteredCount - unlockedCount} locked</span>
          </div>

          {/* Domain table */}
          <div className="mt-2 border border-white/[0.06]">
            <div
              className="grid grid-cols-4 border-b border-white/[0.06] px-4 py-2 text-[9px] tracking-[0.18em] uppercase text-white/20"
              style={{ fontFamily: "'Courier New', monospace" }}
            >
              <span>Domain</span>
              <span className="text-center">Mastered</span>
              <span className="text-center">Time</span>
              <span className="text-right">Focus</span>
            </div>
            {domainStats.map((d) => (
              <div
                key={d.domain}
                className="grid grid-cols-4 items-center px-4 py-3 border-b border-white/[0.04] last:border-b-0"
              >
                <span className="text-[11px] text-white/45">
                  {DOMAIN_LABELS[d.domain]}
                </span>
                <span
                  className="text-center text-[10px] text-white/30"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  {d.mastered}/{d.count}
                </span>
                <span
                  className="text-center text-[10px] text-white/25"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  {d.time > 0 ? formatTime(d.time) : "—"}
                </span>
                <span
                  className="text-right text-[10px] text-white/25"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  {d.avgStruggle > 0
                    ? `${Math.round(d.avgStruggle * 100)}%`
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Per-concept breakdown ── */}
        <section className="space-y-4">
          <p
            className="text-[9px] tracking-[0.22em] uppercase text-white/20 border-b border-white/[0.05] pb-2"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            Productive Struggle by Concept
          </p>

          {conceptMetrics.length === 0 ? (
            <div className="py-12 text-center">
              <p
                className="text-[11px] text-white/25"
                style={{ fontFamily: "'Courier New', monospace" }}
              >
                No lessons completed yet.
              </p>
            </div>
          ) : (
            <div className="space-y-0 border border-white/[0.06]">
              {conceptMetrics.map(({ concept, metrics }, idx) => {
                if (!concept) return null;
                return (
                  <motion.div
                    key={metrics.conceptId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="px-4 py-4 border-b border-white/[0.04] last:border-b-0 space-y-3"
                  >
                    {/* Title row */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/65">{concept.title}</p>
                        <p
                          className="text-[9px] tracking-widest uppercase text-white/20 mt-0.5"
                          style={{ fontFamily: "'Courier New', monospace" }}
                        >
                          {DOMAIN_LABELS[concept.domain]}
                        </p>
                      </div>
                      <span
                        className="text-[10px] text-white/20"
                        style={{ fontFamily: "'Courier New', monospace" }}
                      >
                        {metrics.sessionsCompleted}×
                      </span>
                    </div>

                    {/* Focus bar */}
                    <StruggleRule score={metrics.averageStruggleScore} />

                    {/* Detail row */}
                    <div
                      className="flex flex-wrap gap-4 text-[10px] text-white/25"
                      style={{ fontFamily: "'Courier New', monospace" }}
                    >
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(metrics.totalTimeSeconds)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {metrics.totalAttempts} attempts
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {metrics.totalInteractions} interactions
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
