"use client";

import { useState } from "react";
import type { WorkedExampleBlock } from "@/types";
import { MathBlock, isLatex } from "@/lib/render-math";

export default function WorkedExampleRenderer({ block }: { block: WorkedExampleBlock }) {
  const [revealed, setRevealed] = useState(0);
  const allRevealed = revealed >= block.steps.length;

  return (
    <div className="border border-white/20 rounded-xl p-5 bg-black/60 space-y-4">
      <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">Worked Example</div>
      <h3 className="text-base font-semibold text-white/80">{block.title}</h3>

      {/* Given / Find */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/10 p-3">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Given</div>
          <ul className="space-y-1">
            {block.given.map((g, i) => (
              <li key={i} className="text-sm text-white/70">{g}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-white/10 p-3">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Find</div>
          <p className="text-sm text-white/70">{block.find}</p>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {block.steps.slice(0, revealed).map((step, i) => (
          <div key={step.id} className="rounded-lg border border-white/10 p-3 space-y-2">
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Step {i + 1} — {step.label}
            </div>
            <div
              className="rounded-md bg-white/[0.03] p-3 flex items-center justify-center"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
                backgroundSize: "16px 16px",
              }}
            >
              {isLatex(step.expression) ? (
                <MathBlock
                  tex={step.expression}
                  display={true}
                  className="text-white [&_.katex]:text-lg [&_.katex-display]:my-0"
                />
              ) : (
                <span className="font-mono text-lg text-white">{step.expression}</span>
              )}
            </div>
            <p className="text-sm text-white/60 leading-relaxed">{step.explanation}</p>
          </div>
        ))}
      </div>

      {/* Reveal button */}
      {!allRevealed && (
        <button
          onClick={() => setRevealed((r) => r + 1)}
          className="w-full py-2 rounded-lg border border-white/20 text-sm text-white/60 hover:text-white hover:border-white/40 transition-colors"
        >
          Show Step {revealed + 1} of {block.steps.length}
        </button>
      )}

      {/* Check */}
      {allRevealed && block.check && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="text-xs font-semibold text-emerald-400/60 uppercase tracking-wider mb-1">Check</div>
          <p className="text-sm text-emerald-300/70">{block.check}</p>
        </div>
      )}
    </div>
  );
}
