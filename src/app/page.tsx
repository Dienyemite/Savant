"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import GraphLegend from "@/components/graph/GraphLegend";
import ConceptInfoPanel from "@/components/graph/ConceptInfoPanel";
import LessonModal from "@/components/graph/LessonModal";
import LessonView from "@/components/lesson/LessonView";

// React Flow must be loaded client-side only (uses window/DOM APIs)
const KnowledgeGraph = dynamic(
  () => import("@/components/graph/KnowledgeGraph"),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black notebook-ruled notebook-margin">

      {/* Notebook page header — top binding strip */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between border-b border-white/[0.06] px-16 py-3">
        {/* Page label in margin */}
        <div className="flex items-baseline gap-3">
          <span
            className="text-[10px] tracking-[0.25em] uppercase text-white/20"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            I.
          </span>
          <span className="text-sm font-semibold tracking-widest text-white/70 uppercase">
            Knowledge Constellation
          </span>
        </div>

        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-[11px] tracking-widest uppercase text-white/25 hover:text-white/55 transition-colors border-b border-white/10 hover:border-white/30 pb-px"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            Analytics
          </Link>
          <Link
            href="/onboarding"
            className="text-[11px] tracking-widest uppercase text-white/25 hover:text-white/55 transition-colors border-b border-white/10 hover:border-white/30 pb-px"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            Start Path
          </Link>
          <div
            className="flex items-center gap-2 text-[11px] tracking-wider text-white/20"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            <span className="inline-block w-1.5 h-1.5 border border-white/40 rounded-full" />
            <span>Demo Student</span>
          </div>
        </div>
      </header>

      {/* Knowledge Constellation — fills the notebook page */}
      <div className="relative z-10 w-full h-full pt-12">
        <KnowledgeGraph />
      </div>

      {/* Overlays — panels styled as torn notebook pages / margin annotations */}
      <GraphLegend />
      <ConceptInfoPanel />
      <LessonModal />
      <LessonView />
    </main>
  );
}
