"use client";

import { useGraphStore } from "@/store/graph-store";
import { DOMAIN_LABELS, type ConceptDomain } from "@/types";

const DOMAINS: ConceptDomain[] = [
  "math",
  "science",
  "art",
  "music",
  "language",
  "logic",
];

// ════════════════════════════════════════════════════════════
// GraphLegend — Styled as notebook margin annotation block.
// Sits in the left margin with pencil-thin borders and labels.
// ════════════════════════════════════════════════════════════
export default function GraphLegend() {
  const { concepts, progressMap } = useGraphStore();

  const masteredCount = Array.from(progressMap.values()).filter(
    (s) => s === "mastered"
  ).length;
  const unlockedCount = Array.from(progressMap.values()).filter(
    (s) => s === "unlocked"
  ).length;
  const totalCount = concepts.length;
  const progressPct = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

  return (
    <div
      className="absolute top-16 left-4 z-10 w-52 space-y-5"
      style={{ fontFamily: "'Courier New', monospace" }}
    >
      {/* ── Header ── */}
      <div className="border-b border-white/[0.07] pb-3">
        <p
          className="text-[10px] tracking-[0.22em] uppercase text-white/20 mb-1"
        >
          Fig. I
        </p>
        <h2 className="text-xs font-semibold tracking-widest text-white/55 uppercase">
          Knowledge Map
        </h2>
        <p className="text-[10px] text-white/20 mt-0.5">
          {masteredCount} / {totalCount} concepts mastered
        </p>
      </div>

      {/* ── Progress bar ── */}
      <div className="space-y-1.5">
        {/* Full-width ruled track */}
        <div className="relative w-full h-px bg-white/[0.07]">
          <div
            className="absolute left-0 top-0 h-full bg-white/70 transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between">
          <span className="text-[9px] text-white/20 tracking-widest uppercase">
            Progress
          </span>
          <span className="text-[9px] text-white/30">
            {progressPct}%
          </span>
        </div>
      </div>

      {/* ── Domain list ── */}
      <div className="space-y-2">
        <p className="text-[9px] tracking-[0.2em] uppercase text-white/18 border-b border-white/[0.05] pb-1">
          Domains
        </p>
        <div className="space-y-1">
          {DOMAINS.map((domain) => {
            const count = concepts.filter((c) => c.domain === domain).length;
            if (count === 0) return null;
            const domainMastered = concepts.filter(
              (c) => c.domain === domain && progressMap.get(c.id) === "mastered"
            ).length;
            return (
              <div key={domain} className="flex items-center gap-2">
                {/* Status dot */}
                <div
                  className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                  style={{
                    background:
                      domainMastered === count && count > 0
                        ? "rgba(255,255,255,0.8)"
                        : domainMastered > 0
                        ? "rgba(255,255,255,0.35)"
                        : "rgba(255,255,255,0.1)",
                  }}
                />
                <span className="text-[10px] text-white/40 flex-1 truncate">
                  {DOMAIN_LABELS[domain]}
                </span>
                <span className="text-[9px] text-white/18">
                  {domainMastered}/{count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Status key ── */}
      <div className="space-y-2">
        <p className="text-[9px] tracking-[0.2em] uppercase text-white/18 border-b border-white/[0.05] pb-1">
          Status Key
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white/80 flex-shrink-0" />
            <span className="text-[10px] text-white/40">Mastered</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="8" height="8" viewBox="0 0 8 8" className="flex-shrink-0">
              <circle cx="4" cy="4" r="3" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
            </svg>
            <span className="text-[10px] text-white/40">Unlocked</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="8" height="8" viewBox="0 0 8 8" className="flex-shrink-0">
              <circle cx="4" cy="4" r="3" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="2 1.5" />
            </svg>
            <span className="text-[10px] text-white/25">Locked</span>
          </div>
        </div>
      </div>

      {/* ── In-progress count ── */}
      {unlockedCount > 0 && (
        <p className="text-[10px] text-white/25 border-t border-white/[0.05] pt-2">
          {unlockedCount} concept{unlockedCount !== 1 ? "s" : ""} in progress
        </p>
      )}
    </div>
  );
}
