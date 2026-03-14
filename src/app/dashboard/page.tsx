"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useTelemetryStore } from "@/store/telemetry-store";
import { useGraphStore } from "@/store/graph-store";
import { DOMAIN_COLORS, DOMAIN_LABELS, type ConceptDomain } from "@/types";
import {
  ArrowLeft,
  Clock,
  Brain,
  Target,
  Zap,
  TrendingUp,
  BarChart3,
  Activity,
} from "lucide-react";

// ============================================
// Teacher Dashboard — "Productive Struggle"
// Analytics. Tracks depth of thought, not
// just completion. Shows per-concept metrics
// and overall learning health.
// ============================================

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function StruggleBar({ score }: { score: number }) {
  const color =
    score >= 0.7
      ? "rgba(255,255,255,0.9)"
      : score >= 0.4
      ? "rgba(255,255,255,0.55)"
      : score > 0
      ? "rgba(255,255,255,0.25)"
      : "rgba(255,255,255,0.08)";
  const label =
    score >= 0.7
      ? "Deep Focus"
      : score >= 0.4
      ? "Engaged"
      : score > 0
      ? "Surface"
      : "No data";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-white/8 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-white/30 w-16 text-right">{label}</span>
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

  // Per-concept metrics for concepts that have been attempted
  const conceptMetrics = useMemo(() => {
    const conceptIds = new Set(completedSessions.map((s) => s.conceptId));
    return Array.from(conceptIds).map((cId) => {
      const concept = concepts.find((c) => c.id === cId);
      const metrics = getConceptMetrics(cId);
      return { concept, metrics };
    });
  }, [completedSessions, concepts, getConceptMetrics]);

  // Domain breakdown
  const domainStats = useMemo(() => {
    const domains: Record<
      string,
      { count: number; mastered: number; time: number; struggle: number }
    > = {};

    for (const c of concepts) {
      if (!domains[c.domain]) {
        domains[c.domain] = { count: 0, mastered: 0, time: 0, struggle: 0 };
      }
      domains[c.domain].count++;
      if (progressMap.get(c.id) === "mastered") {
        domains[c.domain].mastered++;
      }
    }

    // Add telemetry data
    for (const session of completedSessions) {
      const concept = concepts.find((c) => c.id === session.conceptId);
      if (concept && domains[concept.domain]) {
        domains[concept.domain].time += session.totalTimeSeconds;
        domains[concept.domain].struggle +=
          session.productiveStruggleScore;
      }
    }

    return Object.entries(domains).map(([domain, stats]) => ({
      domain: domain as ConceptDomain,
      ...stats,
      avgStruggle:
        stats.struggle > 0 && stats.mastered > 0
          ? stats.struggle / stats.mastered
          : 0,
    }));
  }, [concepts, progressMap, completedSessions]);

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-white/35 hover:text-white/70 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-5 w-px bg-white/10" />
            <div>
              <h1 className="text-xl font-bold text-white text-glow-subtle">
                Teacher Dashboard
              </h1>
              <p className="text-xs text-white/35">
                Productive Struggle Analytics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10">
            <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
            <span className="text-xs text-white/40">Demo Student</span>
          </div>
        </div>

        {/* Overview Cards */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
        >
          {[
            {
              icon: BarChart3,
              value: String(overall.totalLessonsCompleted),
              label: "Lessons Completed",
              color: "#06b6d4",
            },
            {
              icon: Clock,
              value: formatTime(overall.totalTimeSeconds),
              label: "Total Study Time",
              color: "#8b5cf6",
            },
            {
              icon: Brain,
              value:
                overall.averageStruggleScore > 0
                  ? `${Math.round(overall.averageStruggleScore * 100)}%`
                  : "—",
              label: "Avg Focus Score",
              color: "#10b981",
            },
            {
              icon: Zap,
              value: String(overall.totalInteractions),
              label: "Total Interactions",
              color: "#f59e0b",
            },
          ].map((card) => (
            <motion.div
              key={card.label}
              variants={fadeUp}
              className="bg-black border border-white/8 rounded-xl p-4 space-y-2"
            >
              <card.icon
                className="w-5 h-5 text-white/50"
              />
              <div className="text-2xl font-bold font-mono text-white">
                {card.value}
              </div>
              <div className="text-[10px] text-white/30 uppercase tracking-widest">
                {card.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Progress Overview */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="bg-black border border-white/8 rounded-xl p-5 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-white/40" />
            <h2 className="text-sm font-semibold text-white/80">
              Knowledge Progress
            </h2>
          </div>

          {/* Overall bar */}
          <div className="space-y-1 mb-5">
            <div className="w-full h-px bg-white/8 rounded-full overflow-hidden flex">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${(masteredCount / concepts.length) * 100}%`,
                }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-white rounded-l-full"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${(unlockedCount / concepts.length) * 100}%`,
                }}
                transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                className="h-full bg-white/40"
              />
            </div>
            <div className="flex justify-between text-xs text-white/30">
              <span>
                {masteredCount} mastered · {unlockedCount} in progress
              </span>
              <span>
                {concepts.length - masteredCount - unlockedCount} locked
              </span>
            </div>
          </div>

          {/* Domain breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {domainStats.map((d) => (
              <div
                key={d.domain}
                className="bg-white/4 rounded-lg p-3 space-y-2 border border-white/6"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-white/60" />
                  <span className="text-xs font-medium text-white/70">
                    {DOMAIN_LABELS[d.domain]}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-white/30">
                  <span>
                    {d.mastered}/{d.count} mastered
                  </span>
                  {d.time > 0 && <span>· {formatTime(d.time)}</span>}
                </div>
                <div className="w-full h-px bg-white/8 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all bg-white"
                    style={{
                      width: `${(d.mastered / d.count) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Per-Concept Breakdown */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="bg-black border border-white/8 rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-white/40" />
            <h2 className="text-sm font-semibold text-white/80">
              Productive Struggle by Concept
            </h2>
          </div>

          {conceptMetrics.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="w-10 h-10 text-white/15 mx-auto mb-3" />
              <p className="text-sm text-white/35">
                No lessons completed yet.
              </p>
              <p className="text-xs text-white/20 mt-1">
                Complete lessons to see analytics here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {conceptMetrics.map(({ concept, metrics }) => {
                if (!concept) return null;
                const color = DOMAIN_COLORS[concept.domain];

                return (
                  <motion.div
                    key={metrics.conceptId}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white/4 border border-white/6 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-white/60" />
                        <span className="text-sm font-medium text-white/80">
                          {concept.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/6 text-white/35">
                          {DOMAIN_LABELS[concept.domain]}
                        </span>
                      </div>
                      <span className="text-xs text-white/30">
                        {metrics.sessionsCompleted} session
                        {metrics.sessionsCompleted !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Productive struggle bar */}
                    <StruggleBar score={metrics.averageStruggleScore} />

                    {/* Metric pills */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <div className="flex items-center gap-1 text-[10px] text-white/30 bg-white/4 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" />
                        {formatTime(metrics.totalTimeSeconds)}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-white/30 bg-white/4 px-2 py-1 rounded-full">
                        <Target className="w-3 h-3" />
                        {metrics.totalAttempts} attempts
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-white/30 bg-white/4 px-2 py-1 rounded-full">
                        <Zap className="w-3 h-3" />
                        {metrics.totalInteractions} interactions
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-white/30 bg-white/4 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" />
                        ~{metrics.averageTimePerSlide}s/slide
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
