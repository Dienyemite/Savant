"use client";

import { useState } from "react";
import type { QuoteAnalysisBlock } from "@/types";

export default function QuoteAnalysisRenderer({ block }: { block: QuoteAnalysisBlock }) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  return (
    <div className="border border-white/20 rounded-xl p-5 bg-black/60 space-y-5">
      <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">Quote Analysis</div>

      {/* Blockquote */}
      <blockquote className="border-l-2 border-white/30 pl-4 py-1">
        <p
          className="text-lg text-white/90 leading-relaxed italic"
          style={{ fontFamily: "'ivy-presto', serif" }}
        >
          &ldquo;{block.source_quote}&rdquo;
        </p>
        <cite className="mt-2 block text-xs text-white/40 not-italic">{block.attribution}</cite>
      </blockquote>

      {/* Prompts */}
      <div className="space-y-3">
        {block.prompts.map((prompt) => (
          <details
            key={prompt.id}
            className="group rounded-lg border border-white/10 overflow-hidden"
          >
            <summary className="flex items-center gap-2 p-3 cursor-pointer list-none select-none hover:bg-white/[0.03] transition-colors">
              <span className="text-xs text-white/30 group-open:rotate-90 transition-transform">▶</span>
              <span className="text-sm text-white/70">{prompt.question}</span>
            </summary>
            <div className="px-3 pb-3 pt-1 space-y-3 border-t border-white/[0.06]">
              <textarea
                className="w-full bg-white/[0.03] border border-white/10 rounded-md p-2 text-sm text-white/70 placeholder-white/20 resize-none focus:outline-none focus:border-white/20 transition-colors"
                rows={3}
                placeholder="Write your response…"
                value={responses[prompt.id] ?? ""}
                onChange={(e) =>
                  setResponses((r) => ({ ...r, [prompt.id]: e.target.value }))
                }
              />
              <button
                onClick={() =>
                  setRevealed((r) => ({ ...r, [prompt.id]: !r[prompt.id] }))
                }
                className="text-xs text-white/40 hover:text-white/70 underline underline-offset-2 transition-colors"
              >
                {revealed[prompt.id] ? "Hide analysis" : "Reveal model analysis"}
              </button>
              {revealed[prompt.id] && (
                <p className="text-sm text-white/50 italic leading-relaxed animate-in fade-in duration-200">
                  {prompt.model_analysis}
                </p>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
