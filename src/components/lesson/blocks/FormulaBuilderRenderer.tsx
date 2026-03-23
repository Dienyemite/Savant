"use client";

import { useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useLessonStore } from "@/store/lesson-store";
import type { FormulaBuilderBlock } from "@/types";
import { Send, RotateCcw, X } from "lucide-react";

interface Props {
  block: FormulaBuilderBlock;
}

export default function FormulaBuilderRenderer({ block }: Props) {
  const { getBlockAnswer, setAnswer, validateBlock } = useLessonStore();
  const answer = getBlockAnswer(block.id);
  const tokens = (answer.value as string[]) ?? [];
  const validation = answer.validationState;

  const handleAddToken = useCallback(
    (token: string) => {
      if (validation === "correct") return;
      setAnswer(block.id, [...tokens, token]);
    },
    [tokens, validation, setAnswer, block.id]
  );

  const handleRemoveToken = useCallback(
    (index: number) => {
      if (validation === "correct") return;
      const updated = tokens.filter((_, i) => i !== index);
      setAnswer(block.id, updated);
    },
    [tokens, validation, setAnswer, block.id]
  );

  const handleReorder = useCallback(
    (newOrder: string[]) => {
      if (validation === "correct") return;
      setAnswer(block.id, newOrder);
    },
    [validation, setAnswer, block.id]
  );

  const handleReset = useCallback(() => {
    setAnswer(block.id, []);
  }, [setAnswer, block.id]);

  const handleSubmit = useCallback(() => {
    validateBlock(block.id);
  }, [block.id, validateBlock]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-5"
    >
      {/* Instruction */}
      <p className="text-sm text-white/70 font-medium">{block.instruction}</p>

      {/* Formula building area */}
      <div
        className={`
          min-h-[64px] flex flex-wrap items-center gap-2 px-4 py-3 border border-dashed
          transition-all
          ${
            validation === "correct"
              ? "border-white/20 bg-white/[0.02]"
              : validation === "incorrect"
              ? "border-white/[0.08] bg-white/[0.01]"
              : tokens.length > 0
              ? "border-white/[0.1] bg-transparent"
              : "border-white/[0.05] bg-transparent"
          }
        `}
      >
        {tokens.length === 0 && (
          <span className="text-sm text-white/20 select-none">
            Click tokens below to build your formula…
          </span>
        )}
        <Reorder.Group
          axis="x"
          values={tokens}
          onReorder={handleReorder}
          className="flex flex-wrap items-center gap-2"
        >
          <AnimatePresence mode="popLayout">
            {tokens.map((token, index) => (
              <Reorder.Item
                key={`${token}-${index}`}
                value={token}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileDrag={{ scale: 1.1, zIndex: 10 }}
                className={`
                  group flex items-center gap-1 px-3 py-1.5 text-sm font-mono font-semibold
                  cursor-grab active:cursor-grabbing select-none border
                  ${
                    validation === "correct"
                      ? "border-white/15 text-white/70 pointer-events-none"
                      : "border-white/[0.08] text-white/70 hover:border-white/20"
                  }
                `}
              >
                {token}
                {validation !== "correct" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveToken(index);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                  >
                    <X className="w-3 h-3 text-white/25 hover:text-white/60" />
                  </button>
                )}
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </div>

      {/* Available tokens */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">
          Available Tokens
        </span>
        <div className="flex flex-wrap gap-2">
          {block.available_tokens.map((token) => (
            <motion.button
              key={token}
              onClick={() => handleAddToken(token)}
              whileHover={{ scale: validation !== "correct" ? 1.05 : 1 }}
              whileTap={{ scale: validation !== "correct" ? 0.95 : 1 }}
              disabled={validation === "correct"}
              className={`
                px-3 py-1.5 text-sm font-mono
                border transition-all
                ${
                  validation === "correct"
                    ? "text-white/20 border-white/[0.05] pointer-events-none"
                    : "text-white/55 border-white/[0.08] hover:border-white/25 cursor-pointer"
                }
              `}
            >
              {token}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {validation !== "correct" && (
          <>
            <button
              onClick={handleSubmit}
              disabled={tokens.length === 0}
              className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-white/30 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors border-b border-white/10 hover:border-white/30 pb-px"
              style={{ fontFamily: "'Courier New', monospace" }}
            >
              <Send className="w-3 h-3" />
              Check
            </button>
            {tokens.length > 0 && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-white/20 hover:text-white/40 transition-colors pb-px"
                style={{ fontFamily: "'Courier New', monospace" }}
              >
                <RotateCcw className="w-3 h-3" />
                Clear
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
              Formula correct. Continue reading.
            </motion.p>
          )}
          {validation === "incorrect" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[11px] text-white/30 italic"
            >
              Not the right order — try rearranging.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
