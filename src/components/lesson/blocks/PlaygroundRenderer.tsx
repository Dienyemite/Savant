"use client";

import React, { useState } from "react";
import type { PlaygroundBlock } from "@/types";
import { getVisualizer } from "@/lib/visualizer-registry";

export default function PlaygroundRenderer({ block }: { block: PlaygroundBlock }) {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(block.parameters.map((p) => [p.id, p.default]))
  );

  const Viz = block.visualization ? getVisualizer(block.visualization) : null;

  return (
    <div className="border border-white/20 rounded-xl p-5 bg-black/60 space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">Playground</div>
        <div className="text-xs text-white/30">{block.title}</div>
      </div>

      {/* Parameters */}
      <div className="space-y-4">
        {block.parameters.map((param) => (
          <div key={param.id}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm text-white/70">{param.label}</label>
              <span className="text-sm font-mono text-white">
                {values[param.id]?.toFixed(2)}{param.unit ? ` ${param.unit}` : ""}
              </span>
            </div>
            <input
              type="range"
              min={param.min}
              max={param.max}
              step={param.step}
              value={values[param.id]}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [param.id]: parseFloat(e.target.value) }))
              }
              className="w-full accent-white"
            />
          </div>
        ))}
      </div>

      {(block.output_label || Viz) && (
        <div className="border border-white/10 rounded-lg overflow-hidden">
          {Viz ? (
            <React.Suspense
              fallback={
                <div className="h-32 flex items-center justify-center text-white/30 text-sm">
                  Loading visualization…
                </div>
              }
            >
              <div style={{ width: "100%", aspectRatio: "2/1" }}>
                <Viz params={values} outputLabel={block.output_label} />
              </div>
            </React.Suspense>
          ) : (
            <div className="p-4 text-center">
              <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{block.output_label}</div>
              <div className="text-white/40 text-sm italic">varies with parameters</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
