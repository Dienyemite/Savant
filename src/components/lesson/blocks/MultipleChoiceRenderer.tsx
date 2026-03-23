"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLessonStore } from "@/store/lesson-store";
import type { MultipleChoiceBlock } from "@/types";
import { Send } from "lucide-react";

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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* Question */}
      <p className="text-base text-white/75 leading-relaxed">
        {block.question}
      </p>

      {/* Options — ruled rows like a notebook list */}
      <div className="border border-white/[0.07]">
        {block.options.map((option, index) => {
          const isSelected = selectedId === option.id;
          const isCorrect = validation !== "idle" && option.id === block.correct_option_id;
          const isWrong = validation === "incorrect" && isSelected && !isCorrect;
          const letter = String.fromCharCode(65 + index);

          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              disabled={validation === "correct"}
              className={`
                w-full flex items-center gap-4 px-4 py-3 text-left
                border-b border-white/[0.05] last:border-b-0
                transition-colors
                ${
                  isCorrect
                    ? "bg-white/[0.04]"
                    : isWrong
                    ? "bg-white/[0.02]"
                    : isSelected
                    ? "bg-white/[0.03]"
                    : "hover:bg-white/[0.015]"
                }
                ${validation === "correct" ? "pointer-events-none" : "cursor-pointer"}
              `}
            >
              {/* Letter */}
              <span
                className="text-[10px] text-white/25 w-5 flex-shrink-0"
                style={{ fontFamily: "'Courier New', monospace" }}
              >
                {letter}.
              </span>

              {/* Text */}
              <span
                className={`text-sm flex-1 ${
                  isCorrect
                    ? "text-white/80"
                    : isWrong
                    ? "text-white/40 line-through"
                    : isSelected
                    ? "text-white/70"
                    : "text-white/45"
                }`}
              >
                {option.text}
              </span>

              {/* State indicator */}
              {isCorrect && (
                <span
                  className="text-[9px] tracking-widest text-white/50"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  ✓
                </span>
              )}
              {isWrong && (
                <span
                  className="text-[9px] tracking-widest text-white/25"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  ✗
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Submit / feedback */}
      <div className="flex items-center gap-4">
        {validation !== "correct" && (
          <button
            onClick={handleSubmit}
            disabled={!selectedId}
            className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-white/30 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors border-b border-white/10 hover:border-white/30 pb-px"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            <Send className="w-3 h-3" />
            Check
          </button>
        )}

        <AnimatePresence mode="wait">
          {validation === "correct" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[11px] text-white/50 italic"
            >
              Correct. Continue reading.
            </motion.p>
          )}
          {validation === "incorrect" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[11px] text-white/30 italic"
            >
              Not quite — reflect and try again.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-5"
    >
      {/* Question */}
      <p className="text-base text-white/80 font-medium leading-relaxed">
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
                    ? "border-white/50 bg-white/8"
                    : isWrong
                    ? "border-red-500/60 bg-red-500/10"
                    : isSelected
                    ? "border-white/30 bg-white/6"
                    : "border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/5"
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
                      ? "bg-white/15 text-white"
                      : isWrong
                      ? "bg-red-500/20 text-red-400"
                      : isSelected
                      ? "bg-white/12 text-white/90"
                      : "bg-white/5 text-white/30"
                  }
                `}
              >
                {letter}
              </span>

              {/* Option text */}
              <span
                className={`text-sm font-medium flex-1 ${
                  isCorrect
                    ? "text-white"
                    : isWrong
                    ? "text-red-300"
                    : isSelected
                    ? "text-white/90"
                    : "text-white/60"
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
                    <CheckCircle2 className="w-5 h-5 text-white" />
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
            className="bg-white hover:bg-white/90 text-black"
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
              className="flex items-center gap-2 text-white"
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
