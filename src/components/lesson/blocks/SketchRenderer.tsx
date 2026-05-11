"use client";

import type { SketchBlock } from "@/types";

// Placeholder sketch renderer — displays a labeled diagram slot.
// Will be wired to Three.js visualizers in a later phase.

export default function SketchRenderer({ block }: { block: SketchBlock }) {
  return (
    <div className="border border-white/20 rounded-xl overflow-hidden bg-black/60">
      <div
        className="h-48 flex flex-col items-center justify-center gap-3 text-white/20"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
          backgroundSize: "20px 20px",
        }}
      >
        <div className="w-16 h-16 border border-dashed border-white/20 rounded-xl flex items-center justify-center">
          <span className="text-2xl">📐</span>
        </div>
        <span className="text-xs text-white/30">{block.diagram_type} diagram</span>
      </div>
      {block.caption && (
        <div className="px-5 py-3 border-t border-white/10">
          <p className="text-xs text-white/50 text-center italic">{block.caption}</p>
        </div>
      )}
    </div>
  );
}
