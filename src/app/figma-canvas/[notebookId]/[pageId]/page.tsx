"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight, CheckCircle2, Share, Plus, Settings, Trash2,
  MousePointer2, PenTool, Eraser, Type, Search,
  LayoutTemplate, Shapes, Files, HelpCircle,
  Minus, Loader2, Sparkles, FileText,
} from "lucide-react";
import { useCanvasStore } from "@/store/canvas-store";
import { useChatStore } from "@/store/chat-store";
import InkLayer from "@/components/canvas/InkLayer";
import TextNoteLayer from "@/components/canvas/TextNoteLayer";
import LessonBlockRenderer from "@/components/lesson/LessonBlockRenderer";
import SocraticChat from "@/components/lesson/SocraticChat";
import type { Page, Notebook, PositionedLessonBlock } from "@/types";
import type { InkStroke, GlobalTextNote } from "@/store/canvas-store";

const PRIMARY_W = 64;
const SECONDARY_W = 256;

export default function CanvasPage() {
  const params = useParams();
  const router = useRouter();
  const notebookId = params.notebookId as string;
  const pageId = params.pageId as string;

  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const hydrateCanvas = useCanvasStore((s) => s.hydrateCanvas);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const setRfContainerOrigin = useCanvasStore((s) => s.setRfContainerOrigin);
  const openChat = useChatStore((s) => s.openChat);

  const [page, setPage] = useState<Page | null>(null);
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [notebookPages, setNotebookPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1.0);
  const [saving, setSaving] = useState(false);
  const [pageTitle, setPageTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/pages/${pageId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/notebooks/${notebookId}/pages`).then((r) =>
        r.ok ? r.json() : { pages: [] as Page[] }
      ),
    ])
      .then(([pageData, pagesData]) => {
        if (pageData?.page) {
          const p = pageData.page as Page;
          setPage(p);
          setNotebook(pageData.notebook as Notebook);
          setPageTitle(p.title);
          const cs = p.canvas_state;
          hydrateCanvas(
            ((cs?.strokes ?? []) as InkStroke[]),
            ((cs?.textNotes ?? []) as GlobalTextNote[])
          );
        }
        setNotebookPages((pagesData?.pages ?? []) as Page[]);
      })
      .finally(() => setLoading(false));
  }, [pageId, notebookId, hydrateCanvas]);

  useEffect(() => {
    setRfContainerOrigin(PRIMARY_W + SECONDARY_W, 0);
  }, [setRfContainerOrigin]);

  useEffect(() => {
    setViewport(0, 0, zoom);
  }, [zoom, setViewport]);

  useEffect(() => {
    const unsubscribe = useCanvasStore.subscribe(() => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const { strokes, textNotes } = useCanvasStore.getState();
        setSaving(true);
        await fetch(`/api/pages/${pageId}/canvas`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canvas_state: { strokes, textNotes, annotations: [] },
          }),
        }).catch(() => {});
        setSaving(false);
      }, 2000);
    });
    return () => {
      unsubscribe();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [pageId]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      if (e.key === "v") setActiveTool("select");
      if (e.key === "p") setActiveTool("pen");
      if (e.key === "e") setActiveTool("eraser");
      if (e.key === "t") setActiveTool("text");
      if ((e.metaKey || e.ctrlKey) && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        setZoom((z) => Math.min(3.0, parseFloat((z + 0.1).toFixed(1))));
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "-") {
        e.preventDefault();
        setZoom((z) => Math.max(0.25, parseFloat((z - 0.1).toFixed(1))));
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setActiveTool]);

  const saveTitle = useCallback(async () => {
    if (!pageTitle.trim() || pageTitle === page?.title) {
      setEditingTitle(false);
      return;
    }
    setPage((p) => (p ? { ...p, title: pageTitle.trim() } : p));
    setEditingTitle(false);
    await fetch(`/api/pages/${pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: pageTitle.trim() }),
    });
  }, [pageTitle, page, pageId]);

  async function generateLesson() {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch(`/api/pages/${pageId}/generate-lesson`, { method: "POST" });
      const data = await res.json() as { lesson_content?: PositionedLessonBlock[]; error?: string };
      if (res.ok) {
        setPage((p) =>
          p ? { ...p, lesson_content: data.lesson_content ?? [], lesson_generated_at: new Date().toISOString() } : p
        );
      } else {
        setGenerateError(data.error ?? `Error ${res.status}: Failed to generate lesson`);
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Network error");
    } finally {
      setGenerating(false);
    }
  }

  async function addPage() {
    const res = await fetch(`/api/notebooks/${notebookId}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Page", topic: "" }),
    });
    if (res.ok) {
      const data = await res.json() as { page?: Page };
      if (data.page) {
        setNotebookPages((ps) => [...ps, data.page!]);
        router.push(`/figma-canvas/${notebookId}/${data.page.id}`);
      }
    }
  }

  function copyShareUrl() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
  }

  const lesson = page?.lesson_content ?? [];

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <aside className="w-16 border-r border-white bg-black flex flex-col items-center py-4 shrink-0 z-20">
        <Link
          href="/figma-dashboard"
          className="mb-8 w-8 h-8 bg-white border border-white rounded flex items-center justify-center text-black text-xs font-bold hover:bg-white/90 transition-colors"
        >
          IB
        </Link>
        <div className="flex-1 space-y-6">
          <IconBtn icon={<Files className="w-5 h-5" />} label="Pages" active />
          <IconBtn icon={<LayoutTemplate className="w-5 h-5" />} label="Templates" />
          <IconBtn icon={<Shapes className="w-5 h-5" />} label="Elements" />
          <IconBtn icon={<Search className="w-5 h-5" />} label="Search" />
        </div>
        <div className="space-y-6 mt-auto">
          <IconBtn icon={<Settings className="w-5 h-5" />} label="Settings" />
          <IconBtn icon={<Trash2 className="w-5 h-5" />} label="Trash" />
        </div>
      </aside>

      <aside className="w-64 border-r border-white bg-black flex flex-col shrink-0 z-20">
        <div className="p-4 flex items-center justify-between border-b border-white">
          <h2 className="font-semibold text-white text-sm">Pages</h2>
          <button onClick={addPage}>
            <Plus className="w-4 h-4 text-white/70 hover:text-white transition-colors" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-9 bg-white/5 rounded-lg animate-pulse" />
              ))
            : notebookPages.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => router.push(`/figma-canvas/${notebookId}/${p.id}`)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    p.id === pageId
                      ? "bg-white text-black font-medium"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded text-[10px] flex items-center justify-center border shrink-0 ${
                      p.id === pageId ? "border-black text-black" : "border-white/50 text-white/50"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="truncate">{p.title}</span>
                </button>
              ))}
          <button
            onClick={addPage}
            className="w-full flex items-center gap-2 justify-center py-2 border border-white/30 hover:border-white hover:bg-white/10 rounded-lg text-sm text-white/70 hover:text-white transition-colors mt-2"
          >
            <Plus className="w-4 h-4" />
            New page
          </button>
        </div>
      </aside>

      <main className="flex-1 relative flex flex-col overflow-hidden">
        <header className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-6 z-10 bg-gradient-to-b from-black/90 to-transparent pointer-events-none">
          <div className="flex items-center gap-2 text-sm pointer-events-auto">
            <Link href="/figma-dashboard" className="text-white/70 hover:text-white transition-colors">
              {notebook?.title ?? "…"}
            </Link>
            <ChevronRight className="w-4 h-4 text-white/50" />
            {editingTitle ? (
              <input
                ref={titleInputRef}
                value={pageTitle}
                onChange={(e) => setPageTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") {
                    setPageTitle(page?.title ?? "");
                    setEditingTitle(false);
                  }
                }}
                className="text-white font-medium bg-transparent border-b border-white focus:outline-none min-w-[120px]"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setEditingTitle(true)}
                className="text-white font-medium hover:text-white/80 transition-colors"
              >
                {page?.title ?? "…"}
              </button>
            )}
            <div className="ml-4 flex items-center gap-1.5 text-xs text-white/50">
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 pointer-events-auto">
            <button
              onClick={copyShareUrl}
              className="bg-white text-black px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-white/90 transition-colors"
            >
              <Share className="w-4 h-4" />
              Share
            </button>
          </div>
        </header>

        <div
          className="flex-1 relative overflow-hidden bg-black"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        >
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black border border-white rounded-xl shadow-2xl px-2 py-1.5 flex items-center gap-1 z-20">
            <ToolBtn icon={<MousePointer2 className="w-4 h-4" />} active={activeTool === "select"} label="Select (V)" onClick={() => setActiveTool("select")} />
            <ToolBtn icon={<PenTool className="w-4 h-4" />} active={activeTool === "pen"} label="Pen (P)" onClick={() => setActiveTool("pen")} />
            <ToolBtn icon={<Eraser className="w-4 h-4" />} active={activeTool === "eraser"} label="Eraser (E)" onClick={() => setActiveTool("eraser")} />
            <ToolBtn icon={<Type className="w-4 h-4" />} active={activeTool === "text"} label="Text (T)" onClick={() => setActiveTool("text")} />
            <div className="w-px h-6 bg-white/20 mx-1" />
            <button onClick={() => openChat()} title="Ask Savant (AI Tutor)" className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          ) : lesson.length > 0 ? (
            <div className="absolute top-28 left-8 right-8 bottom-20 overflow-auto z-10">
              <div className="max-w-3xl mx-auto space-y-4 pb-8">
                {lesson.map((positioned) => (
                  <div key={positioned.block.id} className="border border-white/20 rounded-xl overflow-hidden bg-black/80">
                    <LessonBlockRenderer block={positioned.block} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 pointer-events-none">
              <div className="text-center pointer-events-auto">
                <FileText className="w-16 h-16 mx-auto mb-4 text-white opacity-20" />
                <p className="text-sm font-medium text-white mb-1">No lesson generated yet</p>
                <p className="text-xs text-white/50 mb-6">
                  {page?.topic ? `Topic: ${page.topic}` : "Add a topic and generate a lesson"}
                </p>
                {generateError && (
                  <p className="text-red-400 text-xs mb-4 max-w-xs text-center">{generateError}</p>
                )}
                <button
                  onClick={generateLesson}
                  disabled={generating}
                  className="bg-white text-black px-6 py-2 rounded-md text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  {generating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
                  ) : (
                    <><Sparkles className="w-4 h-4" />Generate Lesson</>
                  )}
                </button>
              </div>
            </div>
          )}

          <InkLayer />
          <TextNoteLayer />

          <div className="absolute bottom-6 right-6 flex items-center gap-2 z-20">
            <button onClick={() => setZoom((z) => Math.min(3.0, parseFloat((z + 0.1).toFixed(1))))} className="w-8 h-8 border border-white rounded bg-black flex items-center justify-center text-white hover:bg-white/10 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={() => setZoom(1.0)} className="px-3 h-8 border border-white rounded bg-black text-xs text-white hover:bg-white/10 transition-colors min-w-[52px]">
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={() => setZoom((z) => Math.max(0.25, parseFloat((z - 0.1).toFixed(1))))} className="w-8 h-8 border border-white rounded bg-black flex items-center justify-center text-white hover:bg-white/10 transition-colors">
              <Minus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      <SocraticChat />
    </div>
  );
}

function IconBtn({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button title={label} className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${active ? "bg-white text-black" : "text-white/70 hover:text-white hover:bg-white/10"}`}>
      {icon}
    </button>
  );
}

function ToolBtn({ icon, active, label, onClick }: { icon: React.ReactNode; active: boolean; label: string; onClick: () => void }) {
  return (
    <button title={label} onClick={onClick} className={`p-1.5 rounded-lg transition-colors ${active ? "bg-white text-black" : "text-white/70 hover:text-white hover:bg-white/10"}`}>
      {icon}
    </button>
  );
}
