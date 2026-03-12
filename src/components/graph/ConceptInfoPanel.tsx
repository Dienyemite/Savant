"use client";

import { motion } from "framer-motion";
import { useGraphStore } from "@/store/graph-store";
import { DOMAIN_COLORS, DOMAIN_LABELS } from "@/types";
import { Badge } from "@/components/ui/badge";
import { X, ArrowRight, Lock } from "lucide-react";

export default function ConceptInfoPanel() {
  const {
    selectedConceptId,
    isLessonModalOpen,
    getConceptNode,
    getPrerequisitesFor,
    getUnlockedBy,
    selectConcept,
    openLessonModal,
    progressMap,
  } = useGraphStore();

  // Only show when a locked node is selected and lesson modal is not open
  if (!selectedConceptId || isLessonModalOpen) return null;

  const node = getConceptNode(selectedConceptId);
  if (!node || node.status !== "locked") return null;

  const { concept } = node;
  const prereqs = getPrerequisitesFor(concept.id);
  const unlocks = getUnlockedBy(concept.id);
  const color = DOMAIN_COLORS[concept.domain];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute top-4 right-4 z-10 w-72 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Badge
            variant="outline"
            className="text-[10px] mb-1"
            style={{ color, borderColor: `${color}40` }}
          >
            {DOMAIN_LABELS[concept.domain]}
          </Badge>
          <h3 className="text-sm font-bold text-slate-200">{concept.title}</h3>
        </div>
        <button
          onClick={() => selectConcept(null)}
          className="text-slate-600 hover:text-slate-400 transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        {concept.description}
      </p>

      {/* Prerequisites to complete */}
      {prereqs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Requires
            </span>
          </div>
          <div className="space-y-1">
            {prereqs.map((p) => {
              const pStatus = progressMap.get(p.id) ?? "locked";
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg bg-slate-800/50"
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      pStatus === "mastered"
                        ? "bg-emerald-500"
                        : pStatus === "unlocked"
                        ? "bg-amber-500"
                        : "bg-slate-600"
                    }`}
                  />
                  <span className="text-slate-400">{p.title}</span>
                  <span
                    className={`ml-auto text-[10px] ${
                      pStatus === "mastered"
                        ? "text-emerald-500"
                        : "text-slate-600"
                    }`}
                  >
                    {pStatus === "mastered" ? "✓" : pStatus}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* What this unlocks */}
      {unlocks.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <ArrowRight className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Unlocks
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unlocks.map((u) => (
              <span
                key={u.id}
                className="text-[10px] px-2 py-0.5 rounded border border-dashed border-slate-700 text-slate-500"
              >
                {u.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
