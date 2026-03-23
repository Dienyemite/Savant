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

      {/* Left margin gutter — navigation lives in the 72px strip to the left of the margin line */}
      <nav className="notebook-nav-margin">
        {/* Page number / section index at top of margin */}
        <span
          className="text-[9px] tracking-[0.3em] text-white/20 leading-none"
          style={{ fontFamily: "'Courier New', monospace", writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          I
        </span>

        {/* Nav items — rotated 90° so they read bottom-to-top along the margin */}
        <Link
          href="/dashboard"
          className="text-[9px] tracking-[0.25em] uppercase text-white/25 hover:text-white/60 transition-colors leading-none"
          style={{ fontFamily: "'Courier New', monospace", writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Analytics
        </Link>
        <Link
          href="/onboarding"
          className="text-[9px] tracking-[0.25em] uppercase text-white/25 hover:text-white/60 transition-colors leading-none"
          style={{ fontFamily: "'Courier New', monospace", writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Start Path
        </Link>

        {/* User indicator — small dot + label */}
        <div
          className="flex flex-col items-center gap-1 text-[9px] tracking-wider text-white/15 leading-none mt-auto mb-6"
          style={{ fontFamily: "'Courier New', monospace", writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          <span className="inline-block w-1.5 h-1.5 border border-white/30 rounded-full mb-1" style={{ writingMode: "horizontal-tb" }} />
          Demo Student
        </div>
      </nav>

      {/* Page title — sits in the content area near the top, aligned to the ruled lines */}
      <div
        className="absolute z-10 top-[18px] left-[88px] leading-none"
        style={{ fontFamily: "'Courier New', monospace" }}
      >
        <span className="text-[11px] tracking-[0.3em] uppercase text-white/40">
          Knowledge Constellation
        </span>
      </div>

      {/* Knowledge Constellation — fills the notebook page to the right of the margin */}
      <div className="relative z-10 w-full h-full notebook-content">
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
