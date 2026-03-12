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
    <main className="relative h-screen w-screen overflow-hidden bg-[#0a0e1a]">
      {/* Background subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0a0e1a] to-slate-950" />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-lg font-bold text-slate-100 tracking-tight">
            Savant
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/40 hover:border-slate-600/60"
          >
            Teacher Dashboard
          </Link>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/40">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-400">Demo Student</span>
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
