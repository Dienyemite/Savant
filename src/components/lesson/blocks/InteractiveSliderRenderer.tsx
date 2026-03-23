"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLessonStore } from "@/store/lesson-store";
import type { InteractiveSliderBlock } from "@/types";
import { Send } from "lucide-react";

interface Props {
  block: InteractiveSliderBlock;
}

export default function InteractiveSliderRenderer({ block }: Props) {
  const { getBlockAnswer, setAnswer, validateBlock } = useLessonStore();
  const answer = getBlockAnswer(block.id);
  const currentValue = (answer.value as number) ?? block.initial_value;
  const validation = answer.validationState;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAnswer(block.id, Number(e.target.value));
    },
    [block.id, setAnswer]
  );

  const handleSubmit = useCallback(() => {
    validateBlock(block.id);
  }, [block.id, validateBlock]);

  const maxDots = Math.min(block.max, 20);
  const dotsToShow = Math.min(currentValue, maxDots);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Label + current value */}
      <div className="flex items-baseline justify-between border-b border-white/[0.05] pb-2">
        <span
          className="text-xs tracking-widest uppercase text-white/30"
          style={{ fontFamily: "'Courier New', monospace" }}
        >
          {block.label}
        </span>
        <motion.span
          key={currentValue}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl text-white/80 tabular-nums"
          style={{ fontFamily: "'Courier New', monospace" }}
        >
          {currentValue}
          {block.unit && (
            <span className="text-xs text-white/25 ml-1">{block.unit}</span>
          )}
        </motion.span>
      </div>

      {/* Visual tally marks — monochrome square tiles */}
      <div className="flex flex-wrap gap-1 min-h-[28px]">
        <AnimatePresence mode="popLayout">
          {Array.from({ length: dotsToShow }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.1, delay: i * 0.015 }}
              className="w-5 h-5 border border-white/20 bg-white/[0.04]"
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Native range input styled as a flat monochrome track */}
      <div className="space-y-1">
        <input
          type="range"
          value={currentValue}
          min={block.min}
          max={block.max}
          step={block.step}
          onChange={handleChange}
          disabled={validation === "correct"}
          className="w-full h-px appearance-none bg-white/20 cursor-pointer disabled:opacity-40
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:border-0
            [&::-webkit-slider-runnable-track]:h-px
            [&::-webkit-slider-runnable-track]:bg-white/20"
        />
        <div className="flex justify-between">
          <span
            className="text-[9px] text-white/20"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            {block.min}
          </span>
          <span
            className="text-[9px] text-white/20"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            {block.max}
          </span>
        </div>
      </div>

      {/* Submit / feedback */}
      <div className="flex items-center gap-4">
        {validation !== "correct" && (
          <button
            onClick={handleSubmit}
            className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-white/30 hover:text-white/60 transition-colors border-b border-white/10 hover:border-white/30 pb-px"
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
              Not quite — adjust and try again.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
