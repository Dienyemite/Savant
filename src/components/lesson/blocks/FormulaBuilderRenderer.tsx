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
      <p className="text-sm text-white/70 font-medium">{block.instruction}</p>

      {/* Formula building area */}
      <div
        className={`
          min-h-[64px] flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed 
          transition-all
          ${
            validation === "correct"
              ? "border-white/35 bg-white/5"
              : validation === "incorrect"
              ? "border-red-500/40 bg-red-500/5"
              : tokens.length > 0
              ? "border-white/12 bg-white/4"
              : "border-white/8 bg-white/2"
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
                  group flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-mono font-semibold
                  cursor-grab active:cursor-grabbing select-none
                  ${
                    validation === "correct"
                      ? "bg-white/12 text-white pointer-events-none"
                      : "bg-white/8 text-white/80 hover:bg-white/12"
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
                px-3 py-1.5 rounded-lg text-sm font-mono font-medium
                border transition-all
                ${
                  validation === "correct"
                    ? "bg-white/3 text-white/20 border-white/6 pointer-events-none"
                    : "bg-white/5 text-white/60 border-white/10 hover:border-white/30 hover:bg-white/8 cursor-pointer"
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
              className="bg-white hover:bg-white/90 text-black"
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
                className="text-white/35 hover:text-white/70"
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
              className="flex items-center gap-2 text-white"
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
