"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLessonStore } from "@/store/lesson-store";
import type { DragDropMatchBlock } from "@/types";
import { CheckCircle2, XCircle, Send, RotateCcw } from "lucide-react";

interface Props {
  block: DragDropMatchBlock;
}

export default function DragDropMatchRenderer({ block }: Props) {
  const { getBlockAnswer, setAnswer, validateBlock } = useLessonStore();
  const answer = getBlockAnswer(block.id);
  const mapping = (answer.value as Record<string, string>) ?? {};
  const validation = answer.validationState;

  // Track which item is currently selected for placement
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const handleSelectItem = useCallback(
    (itemId: string) => {
      if (validation === "correct") return;
      setSelectedItemId((prev) => (prev === itemId ? null : itemId));
    },
    [validation]
  );

  const handleSelectTarget = useCallback(
    (targetId: string) => {
      if (validation === "correct" || !selectedItemId) return;

      const newMapping = { ...mapping };

      // Remove any existing assignment to this target
      for (const [k, v] of Object.entries(newMapping)) {
        if (v === targetId) delete newMapping[k];
      }

      // Remove previous assignment of selected item
      delete newMapping[selectedItemId];

      // Assign item to target
      newMapping[selectedItemId] = targetId;
      setAnswer(block.id, newMapping);
      setSelectedItemId(null);
    },
    [validation, selectedItemId, mapping, setAnswer, block.id]
  );

  const handleReset = useCallback(() => {
    setAnswer(block.id, {});
    setSelectedItemId(null);
  }, [setAnswer, block.id]);

  const handleSubmit = useCallback(() => {
    validateBlock(block.id);
  }, [block.id, validateBlock]);

  // Check if an item is placed
  const getItemTarget = (itemId: string): string | undefined => mapping[itemId];

  // Check if a target has an item
  const getTargetItem = (
    targetId: string
  ): { id: string; content: string } | undefined => {
    const entry = Object.entries(mapping).find(([, v]) => v === targetId);
    if (!entry) return undefined;
    return block.items.find((i) => i.id === entry[0]);
  };

  const allPlaced = block.items.every((item) => mapping[item.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-5"
    >
      {/* Instruction */}
      <p className="text-sm text-slate-300 font-medium">{block.instruction}</p>

      {/* Draggable items (click-to-select) */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
          Items
        </span>
        <div className="flex flex-wrap gap-2">
          {block.items.map((item) => {
            const placed = getItemTarget(item.id);
            const isSelected = selectedItemId === item.id;

            return (
              <motion.button
                key={item.id}
                onClick={() => handleSelectItem(item.id)}
                whileHover={{ scale: validation !== "correct" ? 1.03 : 1 }}
                whileTap={{ scale: validation !== "correct" ? 0.97 : 1 }}
                className={`
                  px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${
                    placed
                      ? "bg-slate-700/30 text-slate-500 border border-slate-700/30"
                      : isSelected
                      ? "bg-cyan-500/20 text-cyan-300 border-2 border-cyan-500/60 shadow-lg shadow-cyan-500/10"
                      : "bg-slate-800 text-slate-200 border border-slate-600/50 hover:border-slate-500 cursor-pointer"
                  }
                  ${validation === "correct" ? "pointer-events-none" : ""}
                `}
                disabled={validation === "correct"}
              >
                {item.content}
                {placed && <span className="ml-1.5 text-xs">✓</span>}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Drop targets */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
          Match to
        </span>
        <div className="grid gap-3">
          {block.targets.map((target) => {
            const placedItem = getTargetItem(target.id);
            const isCorrectTarget =
              validation === "correct" &&
              Object.entries(block.correct_mapping).some(
                ([, v]) => v === target.id
              );

            return (
              <motion.button
                key={target.id}
                onClick={() => handleSelectTarget(target.id)}
                whileHover={{
                  scale:
                    validation !== "correct" && selectedItemId ? 1.01 : 1,
                }}
                className={`
                  flex items-center justify-between px-4 py-3 rounded-xl border-2 border-dashed 
                  transition-all text-left
                  ${
                    selectedItemId && !validation
                      ? "border-cyan-500/40 bg-cyan-500/5 cursor-pointer hover:border-cyan-500/60"
                      : placedItem
                      ? isCorrectTarget
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : validation === "incorrect"
                        ? "border-red-500/40 bg-red-500/5"
                        : "border-slate-600/40 bg-slate-800/30"
                      : "border-slate-700/40 bg-slate-800/20"
                  }
                  ${validation === "correct" ? "pointer-events-none" : ""}
                `}
                disabled={validation === "correct" || !selectedItemId}
              >
                <span className="text-sm font-semibold text-slate-400">
                  {target.label}
                </span>

                <AnimatePresence mode="wait">
                  {placedItem && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className={`text-sm px-3 py-1 rounded-lg ${
                        isCorrectTarget
                          ? "bg-emerald-500/20 text-emerald-300"
                          : validation === "incorrect"
                          ? "bg-red-500/20 text-red-300"
                          : "bg-slate-700/50 text-slate-300"
                      }`}
                    >
                      {placedItem.content}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {validation !== "correct" && (
          <>
            <Button
              onClick={handleSubmit}
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
              disabled={!allPlaced}
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Check Answer
            </Button>
            {Object.keys(mapping).length > 0 && (
              <Button
                onClick={handleReset}
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-slate-200"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset
              </Button>
            )}
          </>
        )}

        <AnimatePresence mode="wait">
          {validation === "correct" && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-emerald-400"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">
                All matched correctly!
              </span>
            </motion.div>
          )}
          {validation === "incorrect" && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-red-400"
            >
              <XCircle className="w-5 h-5" />
              <span className="text-sm">
                Some matches aren&apos;t right — try rearranging.
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
