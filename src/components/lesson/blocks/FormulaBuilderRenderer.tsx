"use client";

import { useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLessonStore } from "@/store/lesson-store";
import type { FormulaBuilderBlock } from "@/types";
import { CheckCircle2, XCircle, Send, RotateCcw, X } from "lucide-react";

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
      <p className="text-sm text-slate-300 font-medium">{block.instruction}</p>

      {/* Formula building area */}
      <div
        className={`
          min-h-[64px] flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed 
          transition-all
          ${
            validation === "correct"
              ? "border-emerald-500/40 bg-emerald-500/5"
              : validation === "incorrect"
              ? "border-red-500/40 bg-red-500/5"
              : tokens.length > 0
              ? "border-slate-600/40 bg-slate-800/30"
              : "border-slate-700/30 bg-slate-800/10"
          }
        `}
      >
        {tokens.length === 0 && (
          <span className="text-sm text-slate-600 select-none">
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
                  group flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-mono font-semibold
                  cursor-grab active:cursor-grabbing select-none
                  ${
                    validation === "correct"
                      ? "bg-emerald-500/20 text-emerald-300 pointer-events-none"
                      : "bg-slate-700/60 text-slate-200 hover:bg-slate-700"
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
                    <X className="w-3 h-3 text-slate-400 hover:text-red-400" />
                  </button>
                )}
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </div>

      {/* Available tokens */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
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
                px-3 py-1.5 rounded-lg text-sm font-mono font-medium
                border transition-all
                ${
                  validation === "correct"
                    ? "bg-slate-800/30 text-slate-600 border-slate-700/30 pointer-events-none"
                    : "bg-slate-800 text-slate-300 border-slate-600/50 hover:border-cyan-500/50 hover:bg-slate-800/80 cursor-pointer"
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
            <Button
              onClick={handleSubmit}
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
              disabled={tokens.length === 0}
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Check Formula
            </Button>
            {tokens.length > 0 && (
              <Button
                onClick={handleReset}
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-slate-200"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Clear
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
              <span className="text-sm font-medium">Formula correct!</span>
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
                Not the right order — try rearranging or changing tokens.
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
