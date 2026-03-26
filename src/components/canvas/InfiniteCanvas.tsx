/**
 * InfiniteCanvas.tsx — The core canvas wrapper
 *
 * Phase 1: "Infinite Canvas — Initialize the chosen canvas engine.
 * Implement the core mechanics: infinite panning and smooth zooming."
 *
 * Architecture:
 *  ┌─ InfiniteCanvas (position: relative, full viewport) ─────────┐
 *  │  ├─ children (KnowledgeGraph / lesson content)               │
 *  │  ├─ TextNoteLayer   z-25  (free-form text annotations)       │
 *  │  ├─ InkLayer        z-30  (SVG freehand drawing overlay)     │
 *  │  └─ CanvasToolbar   z-40  (floating tool palette)            │
 *  └───────────────────────────────────────────────────────────────┘
 *
 * React Flow's own pan/zoom handles the constellation viewport.
 * The ink and text layers are screen-space overlays, matching
 * how a student would annotate over any visible content.
 *
 * The "ruled notebook paper" background is provided by the
 * CSS class `.notebook-ruled` on the page's <main> element.
 */

"use client";

import InkLayer from "./InkLayer";
import TextNoteLayer from "./TextNoteLayer";
import CanvasToolbar from "./CanvasToolbar";

interface InfiniteCanvasProps {
  children: React.ReactNode;
}

export default function InfiniteCanvas({ children }: InfiniteCanvasProps) {
  return (
    <div className="relative w-full h-full">
      {/* Canvas content (constellation graph, lesson view, etc.) */}
      <div className="absolute inset-0">
        {children}
      </div>

      {/* ── Phase 3: Free-form text annotations (screen-space) ── */}
      <TextNoteLayer />

      {/* ── Phase 3: Freehand ink layer (screen-space SVG) ── */}
      <InkLayer />

      {/* ── Phase 1/3: Floating drawing tool palette ── */}
      <CanvasToolbar />
    </div>
  );
}
