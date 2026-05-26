"use client";

import { useState } from "react";
import type { KeyTermsBlock } from "@/types";

export default function KeyTermsRenderer({ block }: { block: KeyTermsBlock }) {
  const [flipped, setFlipped] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="border border-white/20 rounded-xl p-5 bg-black/60 space-y-4">
      <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">Key Terms</div>
      {block.title && (
        <h3 className="text-base font-semibold text-white/80">{block.title}</h3>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {block.terms.map((term) => {
          const isFlipped = flipped.has(term.id);
          return (
            <button
              key={term.id}
              onClick={() => toggle(term.id)}
              className="relative h-28 rounded-lg border border-white/10 overflow-hidden text-left"
              style={{ perspective: "600px" }}
              title={isFlipped ? "Click to flip back" : "Click to reveal definition"}
            >
              {/* Card inner — rotates */}
              <div
                className="absolute inset-0 transition-transform duration-300"
                style={{
                  transformStyle: "preserve-3d",
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* Front */}
                <div
                  className="absolute inset-0 flex items-center justify-center p-3 bg-white/[0.04]"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <span className="text-sm font-semibold text-white/80 text-center leading-snug">
                    {term.term}
                  </span>
                </div>
                {/* Back */}
                <div
                  className="absolute inset-0 flex flex-col justify-center p-3 bg-white/[0.07]"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <p className="text-xs text-white/70 leading-relaxed line-clamp-3">
                    {term.definition}
                  </p>
                  {term.example_sentence && (
                    <p className="mt-1 text-xs text-white/40 italic line-clamp-2">
                      {term.example_sentence}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-white/25 italic text-center">Click a card to reveal its definition</p>
    </div>
  );
}
