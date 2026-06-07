"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Zap, Loader2, ChevronRight, FileText,
  Plus, BookOpen, Pencil,
} from "lucide-react";
import type { Page, Notebook, PositionedLessonBlock } from "@/types";
import LessonBlockRenderer from "@/components/lesson/LessonBlockRenderer";

// ============================================================
// Core Learning Environment
// ============================================================

export default function LearningPage() {
  const params = useParams<{ notebookId: string; pageId: string }>();
  const router = useRouter();

  const [page, setPage] = useState<Page | null>(null);
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [notebookPages, setNotebookPages] = useState<Pick<Page, "id" | "title">[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ink / annotation mode toggle
  const [inkMode, setInkMode] = useState(false);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/pages/${params.pageId}`);
    if (!res.ok) {
      setError("Page not found.");
      setLoading(false);
      return;
    }
    const json = (await res.json()) as { page: Page; notebook: Notebook };
    setPage(json.page);
    setNotebook(json.notebook);
    setLoading(false);
  }, [params.pageId]);

  const loadNotebookPages = useCallback(async () => {
    if (!params.notebookId) return;
    const res = await fetch(`/api/notebooks/${params.notebookId}/pages`);
    if (res.ok) {
      const json = (await res.json()) as { pages: Page[] };
      setNotebookPages(json.pages.map((p) => ({ id: p.id, title: p.title })));
    }
  }, [params.notebookId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPage();
    loadNotebookPages();
  }, [loadPage, loadNotebookPages]);

  const handleGenerateLesson = async () => {
    if (!page) return;
    setGenerating(true);
    setError(null);
    const res = await fetch(`/api/pages/${page.id}/generate-lesson`, { method: "POST" });
    if (res.ok) {
      const json = (await res.json()) as { lesson_content: PositionedLessonBlock[] };
      setPage((prev) => prev ? { ...prev, lesson_content: json.lesson_content } : prev);
    } else {
      const err = (await res.json().catch(() => ({}))).error as string | undefined;
      setError(err ?? "Failed to generate lesson. Please try again.");
    }
    setGenerating(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-black items-center justify-center">
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    );
  }

  if (error && !page) {
    return (
      <div className="flex h-screen bg-black items-center justify-center flex-col gap-4">
        <p className="text-white/50 text-sm">{error}</p>
        <button onClick={() => router.push("/dashboard")} className="text-white text-sm underline">
          Back to dashboard
        </button>
      </div>
    );
  }

  const hasLesson = (page?.lesson_content?.length ?? 0) > 0;

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">

      {/* ── Left sidebar: page list ── */}
      <aside className="w-56 border-r border-white/20 flex flex-col shrink-0 bg-black">
        {/* Back link */}
        <div className="p-4 border-b border-white/20">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          {notebook && (
            <div className="mt-3">
              <div className="text-xs text-white/30 mb-0.5">Notebook</div>
              <div className="text-sm font-medium text-white truncate">{notebook.title}</div>
            </div>
          )}
        </div>

        {/* Pages list */}
        <div className="flex-1 overflow-y-auto py-3 px-2">
          <div className="text-xs text-white/30 px-2 mb-2 tracking-wider">PAGES</div>
          <nav className="space-y-0.5">
            {notebookPages.map((p) => (
              <Link
                key={p.id}
                href={`/notebook/${params.notebookId}/page/${p.id}`}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  p.id === params.pageId
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white hover:bg-white/10"
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{p.title}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* New page */}
        <div className="p-3 border-t border-white/20">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 text-sm text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/10 w-full"
          >
            <Plus className="w-4 h-4" />
            New page
          </Link>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-14 border-b border-white/20 flex items-center justify-between px-6 bg-black shrink-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-white/40">
            <span>{notebook?.title}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white">{page?.title}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setInkMode((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-colors ${
                inkMode
                  ? "bg-white text-black border-white"
                  : "border-white/20 text-white/50 hover:text-white hover:border-white/40"
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              Annotate
            </button>
            {!hasLesson && (
              <button
                onClick={handleGenerateLesson}
                disabled={generating}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-black text-xs font-medium rounded-md hover:bg-white/90 disabled:opacity-50 transition-colors"
              >
                {generating
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Zap className="w-3.5 h-3.5" />}
                {generating ? "Generating…" : "Generate Lesson"}
              </button>
            )}
            {hasLesson && (
              <button
                onClick={handleGenerateLesson}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-white/20 text-white/50 text-xs rounded-md hover:text-white hover:border-white/40 disabled:opacity-50 transition-colors"
              >
                {generating
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Zap className="w-3.5 h-3.5" />}
                Regenerate
              </button>
            )}
          </div>
        </header>

        {/* Canvas / Lesson area */}
        <div className="flex-1 overflow-y-auto">

          {/* Error banner */}
          {error && (
            <div className="mx-8 mt-6 px-4 py-3 bg-red-950/40 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Empty state — no lesson yet */}
          {!hasLesson && !generating && (
            <EmptyLessonState
              title={page?.title ?? ""}
              onGenerate={handleGenerateLesson}
            />
          )}

          {/* Generating skeleton */}
          {generating && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-white/30">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Building your lesson from the textbook…</p>
            </div>
          )}

          {/* Lesson blocks */}
          {hasLesson && !generating && page && (
            <LessonCanvas blocks={page.lesson_content} />
          )}
        </div>
      </main>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────

function EmptyLessonState({ title, onGenerate }: { title: string; onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8">
      <div
        className="w-64 h-48 border border-dashed border-white/20 rounded-xl flex items-center justify-center"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      >
        <BookOpen className="w-10 h-10 text-white/20" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-white mb-2">{title}</h2>
        <p className="text-white/40 text-sm max-w-sm">
          Let Savant generate a personalized lesson for this topic using your textbook.
        </p>
      </div>
      <button
        onClick={onGenerate}
        className="flex items-center gap-2 px-6 py-2.5 bg-white text-black font-medium text-sm rounded-md hover:bg-white/90 transition-colors"
      >
        <Zap className="w-4 h-4" />
        Generate Lesson
      </button>
    </div>
  );
}

// ── Lesson Canvas ────────────────────────────────────────────

function LessonCanvas({ blocks }: { blocks: PositionedLessonBlock[] }) {
  // Determine layout extents to size the canvas
  const maxX = Math.max(...blocks.map((b) => (b.x ?? 0) + (b.width ?? 680)));
  const maxY = Math.max(...blocks.map((b) => (b.y ?? 0) + 300));

  const isMultiColumn = blocks.some((b) => (b.x ?? 0) > 0);

  if (!isMultiColumn) {
    // Single column — render as vertical scroll
    return (
      <div className="max-w-2xl mx-auto py-10 px-6 space-y-6">
        {blocks.map((pb, i) => (
          <LessonBlockRenderer key={i} block={pb.block} />
        ))}
      </div>
    );
  }

  // Multi-column spatial layout
  return (
    <div className="overflow-auto w-full h-full">
      <div
        className="relative"
        style={{ width: maxX + 80, height: maxY + 80 }}
      >
        {blocks.map((pb, i) => (
          <div
            key={i}
            className="absolute"
            style={{ left: pb.x + 40, top: pb.y + 40, width: pb.width }}
          >
            <LessonBlockRenderer block={pb.block} />
          </div>
        ))}
      </div>
    </div>
  );
}
