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
      className="absolute top-4 right-4 z-10 w-72 bg-black border border-white/10 rounded-2xl p-4 space-y-3 glow-border"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Badge
            variant="outline"
            className="text-[10px] mb-1 border-white/20 text-white/50"
          >
            {DOMAIN_LABELS[concept.domain]}
          </Badge>
          <h3 className="text-sm font-bold text-white text-glow-subtle">{concept.title}</h3>
        </div>
        <button
          onClick={() => selectConcept(null)}
          className="text-white/25 hover:text-white/60 transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-white/40 leading-relaxed">
        {concept.description}
      </p>

      {/* Prerequisites to complete */}
      {prereqs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-white/30" />
            <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">
              Requires
            </span>
          </div>
          <div className="space-y-1">
            {prereqs.map((p) => {
              const pStatus = progressMap.get(p.id) ?? "locked";
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg bg-white/4 border border-white/6"
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      pStatus === "mastered"
                        ? "bg-white"
                        : pStatus === "unlocked"
                        ? "bg-white/60"
                        : "bg-white/15"
                    }`}
                  />
                  <span className="text-white/50">{p.title}</span>
                  <span
                    className={`ml-auto text-[10px] ${
                      pStatus === "mastered"
                        ? "text-white"
                        : "text-white/25"
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
            <ArrowRight className="w-3 h-3 text-white/30" />
            <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">
              Unlocks
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unlocks.map((u) => (
              <span
                key={u.id}
                className="text-[10px] px-2 py-0.5 rounded border border-dashed border-white/15 text-white/30"
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
