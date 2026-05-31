"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import GraphLegend from "@/components/graph/GraphLegend";
import ConceptInfoPanel from "@/components/graph/ConceptInfoPanel";
import LessonModal from "@/components/graph/LessonModal";
import LessonView from "@/components/lesson/LessonView";
import InfiniteCanvas from "@/components/canvas/InfiniteCanvas";
import NotebookCover from "@/components/cover/NotebookCover";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useCanvasStore } from "@/store/canvas-store";
import { useGraphStore } from "@/store/graph-store";
import { useAuth } from "@/components/AuthProvider";
import type { ProgressStatus } from "@/types";
import type { InkStroke, GlobalTextNote } from "@/store/canvas-store";

// React Flow must be loaded client-side only (uses window/DOM APIs)
const KnowledgeGraph = dynamic(
  () => import("@/components/graph/KnowledgeGraph"),
  { ssr: false }
);

export default function Home() {
  const isCoverOpen = useCanvasStore((s) => s.isCoverOpen);
  const hydrateCanvas = useCanvasStore((s) => s.hydrateCanvas);
  const applyUserPreferences = useGraphStore((s) => s.applyUserPreferences);
  const hydrateProgress = useGraphStore((s) => s.hydrateProgress);
  const setProgressPersistHandler = useGraphStore((s) => s.setProgressPersistHandler);
  const clearProgressPersistHandler = useGraphStore((s) => s.clearProgressPersistHandler);
  const { user } = useAuth();

  // Apply onboarding selections persisted to sessionStorage by /onboarding.
  useEffect(() => {
    const raw = sessionStorage.getItem("savant_onboarding");
    if (!raw) return;
    try {
      const prefs = JSON.parse(raw);
      applyUserPreferences(prefs);
    } catch {
      // Malformed sessionStorage value — ignore and use seed defaults.
    }
  }, [applyUserPreferences]);

  // Load persisted progress from Supabase when user is authenticated
  useEffect(() => {
    if (!user) return;
    fetch("/api/progress")
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { data: { conceptId: string; status: string }[] } | null) => {
        if (!json?.data) return;
        hydrateProgress(
          json.data.map((r) => ({
            conceptId: r.conceptId,
            status: r.status as ProgressStatus,
          }))
        );
      })
      .catch(() => {/* silent — seed defaults remain active */});
  }, [user, hydrateProgress]);

  // Register the progress persistence adapter — injected here so graph-store
  // stays free of network and auth concerns (Ports & Adapters).
  useEffect(() => {
    if (!user) {
      clearProgressPersistHandler();
      return;
    }
    setProgressPersistHandler((conceptId, status) => {
      fetch("/api/progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptId, status }),
      }).catch(() => {/* silent — non-blocking */});
    });
    return () => clearProgressPersistHandler();
  }, [user, setProgressPersistHandler, clearProgressPersistHandler]);

  // Load persisted global canvas state from Supabase when user is authenticated
  useEffect(() => {
    if (!user) return;
    fetch("/api/canvas")
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { strokes?: InkStroke[]; textNotes?: GlobalTextNote[] } | null) => {
        if (!json) return;
        hydrateCanvas(json.strokes ?? [], json.textNotes ?? []);
      })
      .catch(() => {/* silent */});
  }, [user, hydrateCanvas]);

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
          <ErrorBoundary>
            <KnowledgeGraph />
          </ErrorBoundary>
        </div>
      </InfiniteCanvas>

      {/* Overlay panels (above ink layer) */}
      <GraphLegend />
      <ConceptInfoPanel />
      <LessonModal />
      <ErrorBoundary>
        <LessonView />
      </ErrorBoundary>

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
