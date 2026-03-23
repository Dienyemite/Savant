"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLessonStore } from "@/store/lesson-store";
import type { DragDropMatchBlock } from "@/types";
import { Send, RotateCcw } from "lucide-react";

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
      <p className="text-sm text-white/70 font-medium">{block.instruction}</p>

      {/* Draggable items (click-to-select) */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">
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
                  px-4 py-2.5 text-sm transition-all
                  ${
                    placed
                      ? "text-white/25 border border-white/[0.05]"
                      : isSelected
                      ? "text-white border border-white/40"
                      : "text-white/60 border border-white/[0.08] hover:border-white/20 cursor-pointer"
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
        <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">
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
                  flex items-center justify-between px-4 py-3 border border-dashed
                  transition-all text-left
                  ${
                    selectedItemId && !validation
                      ? "border-white/20 bg-white/[0.02] cursor-pointer hover:border-white/30"
                      : placedItem
                      ? isCorrectTarget
                        ? "border-white/25 bg-white/[0.03]"
                        : validation === "incorrect"
                        ? "border-white/[0.06] bg-white/[0.01]"
                        : "border-white/[0.09] bg-white/[0.03]"
                      : "border-white/[0.06] bg-transparent"
                  }
                  ${validation === "correct" ? "pointer-events-none" : ""}
                `}
                disabled={validation === "correct" || !selectedItemId}
              >
                <span className="text-sm font-semibold text-white/50">
                  {target.label}
                </span>

                <AnimatePresence mode="wait">
                  {placedItem && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className={`text-sm px-2 py-0.5 border ${
                        isCorrectTarget
                          ? "border-white/20 text-white/70"
                          : validation === "incorrect"
                          ? "border-white/[0.06] text-white/25"
                          : "border-white/[0.08] text-white/50"
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
            <button
              onClick={handleSubmit}
              disabled={!allPlaced}
              className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-white/30 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors border-b border-white/10 hover:border-white/30 pb-px"
              style={{ fontFamily: "'Courier New', monospace" }}
            >
              <Send className="w-3 h-3" />
              Check
            </button>
            {Object.keys(mapping).length > 0 && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-white/20 hover:text-white/40 transition-colors pb-px"
                style={{ fontFamily: "'Courier New', monospace" }}
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </>
        )}

        <AnimatePresence mode="wait">
          {validation === "correct" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[11px] text-white/50 italic"
            >
              All matched. Continue reading.
            </motion.p>
          )}
          {validation === "incorrect" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[11px] text-white/30 italic"
            >
              Some matches are wrong — try rearranging.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
