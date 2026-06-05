"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLessonStore } from "@/store/lesson-store";
import type { MultipleChoiceBlock } from "@/types";
import { Send } from "lucide-react";

interface Props {
  block: MultipleChoiceBlock;
}

const DEFAULT_ANSWER = { value: null as string | null, validationState: "idle" as const, attempts: 0 };

export default function MultipleChoiceRenderer({ block }: Props) {
  // Subscribe directly to the answers slice so the component re-renders when
  // validateBlock or setAnswer updates answers[block.id].
  const answer = useLessonStore(
    (state) => (state.answers[block.id] as { value: string | null; validationState: "idle" | "correct" | "incorrect"; attempts: number } | undefined) ?? DEFAULT_ANSWER
  );
  const setAnswer = useLessonStore((state) => state.setAnswer);
  const validateBlock = useLessonStore((state) => state.validateBlock);
  const selectedId = answer.value;

  // Local validation state — always works even without an active lesson (notebook page context).
  // When startLesson() has been called (LessonView context), the store's validateBlock also
  // updates answer.validationState, which takes precedence via the merged value below.
  const [localValidation, setLocalValidation] = useState<"idle" | "correct" | "incorrect">("idle");

  // Store-level validation takes precedence; local is the fallback for notebook context.
  const validation = answer.validationState !== "idle" ? answer.validationState : localValidation;

  const handleSelect = useCallback(
    (optionId: string) => {
      if (validation === "correct") return;
      setAnswer(block.id, optionId);
      setLocalValidation("idle"); // Reset on new selection
    },
    [validation, setAnswer, block.id]
  );

  const handleSubmit = useCallback(() => {
    if (!selectedId) return;
    // Always validate locally — this works regardless of whether a lesson is active.
    const isCorrect = selectedId === block.correct_option_id;
    setLocalValidation(isCorrect ? "correct" : "incorrect");
    // Also notify the lesson store so canAdvance() works in LessonView context.
    validateBlock(block.id);
  }, [block.id, block.correct_option_id, selectedId, validateBlock]);

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
                    ? "bg-red-500/[0.08] border-l-2 border-red-500/40"
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
                    ? "text-red-300/60 line-through"
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
              className="text-[11px] text-amber-400/70 italic"
            >
              Not quite — reflect and try again.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
