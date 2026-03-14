"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useLessonStore, type ValidationState } from "@/store/lesson-store";
import type { InteractiveSliderBlock } from "@/types";
import { CheckCircle2, XCircle, Send } from "lucide-react";

interface Props {
  block: InteractiveSliderBlock;
}

export default function InteractiveSliderRenderer({ block }: Props) {
  const { getBlockAnswer, setAnswer, validateBlock } = useLessonStore();
  const answer = getBlockAnswer(block.id);
  const currentValue = (answer.value as number) ?? block.initial_value;
  const validation = answer.validationState;

  const handleChange = useCallback(
    (value: number | readonly number[]) => {
      const v = Array.isArray(value) ? value[0] : value;
      setAnswer(block.id, v);
    },
    [block.id, setAnswer]
  );

  const handleSubmit = useCallback(() => {
    validateBlock(block.id);
  }, [block.id, validateBlock]);

  // Generate visual dots/objects for the value
  const maxDots = Math.min(block.max, 20);
  const dotsToShow = Math.min(currentValue, maxDots);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* Label */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/70">
          {block.label}
        </span>
        <motion.span
          key={currentValue}
          initial={{ scale: 1.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-2xl font-bold font-mono tabular-nums"
          style={{
            color:
              validation === "correct"
                ? "#34d399"
                : validation === "incorrect"
                ? "#f87171"
                : "#ffffff",
          }}
        >
          {currentValue}
          {block.unit && (
            <span className="text-sm font-normal text-white/35 ml-1.5">
              {block.unit}
            </span>
          )}
        </motion.span>
      </div>

      {/* Visual object representation */}
      <div className="flex flex-wrap gap-1.5 min-h-[32px] justify-center py-2">
        <AnimatePresence mode="popLayout">
          {Array.from({ length: dotsToShow }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 25,
                delay: i * 0.02,
              }}
              className="w-6 h-6 rounded-lg"
              style={{
                backgroundColor:
                  validation === "correct"
                    ? "#34d39930"
                    : validation === "incorrect"
                    ? "#f8717130"
                    : "rgba(255,255,255,0.07)",
                border: `1px solid ${
                  validation === "correct"
                    ? "#34d39960"
                    : validation === "incorrect"
                    ? "#f8717160"
                    : "rgba(255,255,255,0.15)"
                }`,
              }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Slider */}
      <div className="px-1">
        <Slider
          value={[currentValue]}
          min={block.min}
          max={block.max}
          step={block.step}
          onValueChange={handleChange}
          disabled={validation === "correct"}
          className="[&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2"
        />
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-white/20">{block.min}</span>
          <span className="text-[10px] text-white/20">{block.max}</span>
        </div>
      </div>

      {/* Submit / Feedback */}
      <div className="flex items-center gap-3">
        {validation !== "correct" && (
          <Button
            onClick={handleSubmit}
            size="sm"
            className="bg-white hover:bg-white/90 text-black"
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
                Not quite — try adjusting the slider.
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
