"use client";

import { motion } from "framer-motion";
import { useLessonStore } from "@/store/lesson-store";
import type { VisualFeedbackBlock } from "@/types";

interface Props {
  block: VisualFeedbackBlock;
}

export default function VisualFeedbackRenderer({ block }: Props) {
  const { getBlockAnswer } = useLessonStore();

  // Get the value from the referenced data source block
  const sourceAnswer = getBlockAnswer(block.data_source);
  const rawValue = (sourceAnswer.value as number) ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-3"
    >
    <span
      className="text-[10px] text-white/25 uppercase tracking-widest"
      style={{ fontFamily: "'Courier New', monospace" }}
    >
      {block.label}
    </span>

      {block.visualization_type === "number_line" && (
        <NumberLineViz value={rawValue} />
      )}

      {block.visualization_type === "scale" && (
        <ScaleViz value={rawValue} />
      )}

      {block.visualization_type === "bar_chart" && (
        <BarChartViz value={rawValue} />
      )}

      {block.visualization_type === "pie_chart" && (
        <PieChartViz value={rawValue} />
      )}
    </motion.div>
  );
}

// --- Sub-visualizations ---

function NumberLineViz({ value }: { value: number }) {
  const max = 20;
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className="relative h-10 border border-white/[0.07] overflow-hidden">
      {/* Tick marks */}
      <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between">
        {Array.from({ length: max + 1 }).map((_, i) =>
          i % 5 === 0 ? (
            <div key={i} className="flex flex-col items-center">
              <div className="w-px h-3 bg-white/20" />
              <span className="text-[8px] text-white/20 mt-0.5">{i}</span>
            </div>
          ) : (
            <div key={i} className="w-px h-1.5 bg-white/8" />
          )
        )}
      </div>
      {/* Marker */}
      <motion.div
        animate={{ left: `calc(${pct}% - 6px + 16px)` }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white"
      />
    </div>
  );
}

function ScaleViz({ value }: { value: number }) {
  // A simple balance-scale representation
  const mid = 10;
  const tilt = Math.max(-15, Math.min(15, (value - mid) * 2));

  return (
    <div className="flex flex-col items-center py-4">
      {/* Beam */}
      <motion.div
        animate={{ rotate: tilt }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative w-48 h-px bg-white/30 rounded-full origin-center"
      >
        {/* Left pan */}
        <div className="absolute -left-2 -top-3 w-6 h-6 border border-white/20 flex items-center justify-center">
          <span className="text-[8px] font-mono text-white/60">
            {value}
          </span>
        </div>
        {/* Right pan */}
        <div className="absolute -right-2 -top-3 w-6 h-6 border border-white/20 flex items-center justify-center">
          <span className="text-[8px] font-mono text-white/60">
            {mid}
          </span>
        </div>
      </motion.div>
      {/* Base */}
      <div className="w-1 h-8 bg-white/20 rounded-b" />
      <div className="w-12 h-px bg-white/20 rounded" />
    </div>
  );
}

function BarChartViz({ value }: { value: number }) {
  const max = 20;
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div className="flex items-end gap-1 h-24">
      <motion.div
        animate={{ height: `${pct}%` }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full bg-white/35 min-h-[4px]"
      />
    </div>
  );
}

function PieChartViz({ value }: { value: number }) {
  const max = 10;
  const fraction = Math.min(value / max, 1);
  const degrees = fraction * 360;

  return (
    <div className="flex items-center justify-center py-4">
      <div
        className="w-20 h-20"
        style={{
          background: `conic-gradient(rgba(255,255,255,0.7) ${degrees}deg, rgba(255,255,255,0.08) ${degrees}deg)`,
        }}
      />
    </div>
  );
}
