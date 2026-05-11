"use client";

import type { AnalogyBlock } from "@/types";

export default function AnalogyBlockRenderer({ block }: { block: AnalogyBlock }) {
  return (
    <div className="border border-white/20 rounded-xl p-5 bg-black/60 space-y-3">
      <div className="flex items-center gap-2 text-white/40 text-xs font-semibold tracking-wider uppercase">
        <span>Analogy</span>
      </div>
      <blockquote className="text-white/80 text-base italic leading-relaxed border-l-2 border-white/30 pl-4">
        {block.analogy_text}
      </blockquote>
      {block.real_world_example && (
        <div className="bg-white/5 rounded-lg px-4 py-3">
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Real-world example</div>
          <p className="text-sm text-white/70">{block.real_world_example}</p>
        </div>
      )}
    </div>
  );
}
