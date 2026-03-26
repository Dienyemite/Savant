"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import GraphLegend from "@/components/graph/GraphLegend";
import ConceptInfoPanel from "@/components/graph/ConceptInfoPanel";
import LessonModal from "@/components/graph/LessonModal";
import LessonView from "@/components/lesson/LessonView";
import InfiniteCanvas from "@/components/canvas/InfiniteCanvas";
import NotebookCover from "@/components/cover/NotebookCover";
import { useCanvasStore } from "@/store/canvas-store";

// React Flow must be loaded client-side only (uses window/DOM APIs)
const KnowledgeGraph = dynamic(
  () => import("@/components/graph/KnowledgeGraph"),
  { ssr: false }
);

export default function Home() {
  const isCoverOpen = useCanvasStore((s) => s.isCoverOpen);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black notebook-ruled notebook-margin">

      {/*
        Phase 1 — Infinite Canvas
        Wraps the constellation view and provides:
          • Freehand ink layer (perfect-freehand SVG overlay)
          • Free-form text note layer (click anywhere to annotate)
          • Floating drawing toolbar (V / P / E / T shortcuts)
      */}
      <InfiniteCanvas>
        {/* Left margin gutter — navigation in the 72px strip */}
        <nav className="notebook-nav-margin">
          <span
            className="text-[9px] tracking-[0.3em] text-white/18 leading-none"
            style={{ fontFamily: "'Courier New', monospace", writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            I
          </span>
          <Link
            href="/dashboard"
            className="text-[9px] tracking-[0.25em] uppercase text-white/22 hover:text-white/55 transition-colors leading-none"
            style={{ fontFamily: "'Courier New', monospace", writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Analytics
          </Link>
          <Link
            href="/onboarding"
            className="text-[9px] tracking-[0.25em] uppercase text-white/22 hover:text-white/55 transition-colors leading-none"
            style={{ fontFamily: "'Courier New', monospace", writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Start Path
          </Link>
          <div
            className="mt-auto mb-6 text-[9px] tracking-wider text-white/14 leading-none"
            style={{ fontFamily: "'Courier New', monospace", writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            <span
              className="inline-block w-1.5 h-1.5 border border-white/25 rounded-full mb-1"
              style={{ writingMode: "horizontal-tb" }}
            />
            Demo Student
          </div>
        </nav>

        {/* Page label */}
        <div
          className="absolute z-10 top-[18px] left-[88px] leading-none"
          style={{ fontFamily: "'Courier New', monospace" }}
        >
          <span className="text-[11px] tracking-[0.3em] uppercase text-white/35">
            Knowledge Constellation
          </span>
        </div>

        {/* Knowledge graph — fills content area right of the margin */}
        <div className="relative z-10 w-full h-full notebook-content">
          <KnowledgeGraph />
        </div>
      </InfiniteCanvas>

      {/* Overlay panels (above ink layer) */}
      <GraphLegend />
      <ConceptInfoPanel />
      <LessonModal />
      <LessonView />

      {/*
        Phase 2 — The Front Cover
        Renders over everything when the site first loads.
        Dismissed with a page-turn animation once the user
        selects a learning path and subject.
      */}
      {isCoverOpen && <NotebookCover />}
    </main>
  );
}
