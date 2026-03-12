"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLessonStore } from "@/store/lesson-store";
import type { MultipleChoiceBlock } from "@/types";
import { CheckCircle2, XCircle, Send } from "lucide-react";

interface Props {
  block: MultipleChoiceBlock;
}

export default function MultipleChoiceRenderer({ block }: Props) {
  const { getBlockAnswer, setAnswer, validateBlock } = useLessonStore();
  const answer = getBlockAnswer(block.id);
  const selectedId = answer.value as string | null;
  const validation = answer.validationState;

  const handleSelect = useCallback(
    (optionId: string) => {
      if (validation === "correct") return;
      setAnswer(block.id, optionId);
    },
    [validation, setAnswer, block.id]
  );

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
      {/* Question */}
      <p className="text-base text-slate-200 font-medium leading-relaxed">
        {block.question}
      </p>

      {/* Options */}
      <div className="grid gap-2.5">
        {block.options.map((option, index) => {
          const isSelected = selectedId === option.id;
          const isCorrect =
            validation !== "idle" && option.id === block.correct_option_id;
          const isWrong =
            validation === "incorrect" && isSelected && !isCorrect;

          const letter = String.fromCharCode(65 + index); // A, B, C, D

          return (
            <motion.button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              whileHover={{
                scale: validation !== "correct" ? 1.01 : 1,
              }}
              whileTap={{
                scale: validation !== "correct" ? 0.99 : 1,
              }}
              className={`
                flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left
                transition-all duration-200
                ${
                  isCorrect
                    ? "border-emerald-500/60 bg-emerald-500/10"
                    : isWrong
                    ? "border-red-500/60 bg-red-500/10"
                    : isSelected
                    ? "border-cyan-500/60 bg-cyan-500/10"
                    : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60"
                }
                ${validation === "correct" ? "pointer-events-none" : "cursor-pointer"}
              `}
              disabled={validation === "correct"}
            >
              {/* Letter badge */}
              <span
                className={`
                  flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold flex-shrink-0
                  ${
                    isCorrect
                      ? "bg-emerald-500/20 text-emerald-400"
                      : isWrong
                      ? "bg-red-500/20 text-red-400"
                      : isSelected
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "bg-slate-700/50 text-slate-500"
                  }
                `}
              >
                {letter}
              </span>

              {/* Option text */}
              <span
                className={`text-sm font-medium flex-1 ${
                  isCorrect
                    ? "text-emerald-300"
                    : isWrong
                    ? "text-red-300"
                    : isSelected
                    ? "text-cyan-200"
                    : "text-slate-300"
                }`}
              >
                {option.text}
              </span>

              {/* Result indicator */}
              <AnimatePresence>
                {isCorrect && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </motion.div>
                )}
                {isWrong && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <XCircle className="w-5 h-5 text-red-400" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        {validation !== "correct" && (
          <Button
            onClick={handleSubmit}
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
            disabled={!selectedId}
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Check Answer
          </Button>
        )}

        <AnimatePresence mode="wait">
          {validation === "correct" && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-emerald-400"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Correct!</span>
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
                Not quite — think about it and try again.
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
