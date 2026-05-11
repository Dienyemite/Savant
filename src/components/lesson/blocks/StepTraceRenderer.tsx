"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import type { StepTraceBlock } from "@/types";

export default function StepTraceRenderer({ block }: { block: StepTraceBlock }) {
  const [current, setCurrent] = useState(0);
  const steps = block.steps;
  const step = steps[current];

  return (
    <div className="border border-white/20 rounded-xl p-5 bg-black/60 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">Step trace</div>
        <div className="text-xs text-white/30">{current + 1} / {steps.length}</div>
      </div>

      {/* Expression display */}
      <div
        className="rounded-lg border border-white/10 p-4 min-h-18 flex items-center justify-center"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
          backgroundSize: "16px 16px",
        }}
      >
        <span className="text-xl font-mono text-white tracking-wide">{step.expression}</span>
      </div>

      {/* Description */}
      <p className="text-sm text-white/70 leading-relaxed">{step.description}</p>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCurrent(0)}
          className="p-2 border border-white/20 rounded-md text-white/40 hover:text-white hover:border-white/40 transition-colors disabled:opacity-30"
          disabled={current === 0}
          title="Restart"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="p-2 border border-white/20 rounded-md text-white/40 hover:text-white hover:border-white/40 transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 flex gap-1">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i === current ? "bg-white" : i < current ? "bg-white/40" : "bg-white/10"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => setCurrent((c) => Math.min(steps.length - 1, c + 1))}
          disabled={current === steps.length - 1}
          className="p-2 border border-white/20 rounded-md text-white/40 hover:text-white hover:border-white/40 transition-colors disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
