"use client";

import { useGraphStore } from "@/store/graph-store";
import { DOMAIN_COLORS, DOMAIN_LABELS, type ConceptDomain } from "@/types";

const DOMAINS: ConceptDomain[] = [
  "math",
  "science",
  "art",
  "music",
  "language",
  "logic",
];

export default function GraphLegend() {
  const { concepts, progressMap } = useGraphStore();

  const masteredCount = Array.from(progressMap.values()).filter(
    (s) => s === "mastered"
  ).length;
  const unlockedCount = Array.from(progressMap.values()).filter(
    (s) => s === "unlocked"
  ).length;
  const totalCount = concepts.length;

  return (
    <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 space-y-4 min-w-[200px]">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-slate-100 tracking-tight">
          Knowledge Constellation
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {masteredCount}/{totalCount} concepts mastered
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(masteredCount / totalCount) * 100}%` }}
          />
          <div
            className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>{masteredCount} mastered</span>
          <span>{unlockedCount} in progress</span>
        </div>
      </div>

      {/* Domain legend */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
          Domains
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {DOMAINS.map((domain) => {
            const count = concepts.filter((c) => c.domain === domain).length;
            if (count === 0) return null;
            return (
              <div key={domain} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: DOMAIN_COLORS[domain] }}
                />
                <span className="text-[11px] text-slate-400 truncate">
                  {DOMAIN_LABELS[domain]}
                </span>
                <span className="text-[10px] text-slate-600 ml-auto">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status legend */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
          Status
        </span>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-slate-400">Mastered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[11px] text-slate-400">Unlocked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-600" />
            <span className="text-[11px] text-slate-400">Locked</span>
          </div>
        </div>
      </div>
    </div>
  );
}
