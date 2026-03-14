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
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4">
        <span className="text-xl font-bold text-white text-glow tracking-widest uppercase">
          Savant
        </span>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-xs text-white/40 hover:text-white/80 transition-colors px-3 py-1.5 rounded-full border border-white/10 hover:border-white/25"
          >
            Teacher Dashboard
          </Link>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10">
            <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
            <span className="text-xs text-white/40">Demo Student</span>
          </div>
        </div>
      </header>

      {/* Knowledge Graph */}
      <div className="relative z-10 w-full h-full pt-14">
        <KnowledgeGraph />
      </div>

      {/* Overlays */}
      <GraphLegend />
      <ConceptInfoPanel />
      <LessonModal />
      <LessonView />
    </main>
  );
}
