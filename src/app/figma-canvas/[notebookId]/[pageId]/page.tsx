"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronRight, Plus, Settings, Trash2, Files, Search,
  MousePointer2, PenTool, Eraser, Highlighter, Type,
  Undo, Redo, MoreHorizontal, X, Loader2, Zap, MessageCircle,
  CheckCircle2, Share, BookOpen, FileText,
} from 'lucide-react';
import { useCanvasStore } from '@/store/canvas-store';
import type { CanvasTool } from '@/store/canvas-store';
import { useChatStore } from '@/store/chat-store';
import InkLayer from '@/components/canvas/InkLayer';
import TextNoteLayer from '@/components/canvas/TextNoteLayer';
import LessonBlockRenderer from '@/components/lesson/LessonBlockRenderer';
import SocraticChat from '@/components/lesson/SocraticChat';
import type { Page, Notebook, PositionedLessonBlock } from '@/types';

// ─────────────────────────────────────────────
// Main Canvas Page
// ─────────────────────────────────────────────

export default function CanvasPage() {
  const params = useParams<{ notebookId: string; pageId: string }>();
  const router = useRouter();

  const [page, setPage] = useState<Page | null>(null);
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [notebookPages, setNotebookPages] = useState<Pick<Page, 'id' | 'title'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecondary, setShowSecondary] = useState(true);
  const [showNewPage, setShowNewPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [creatingPage, setCreatingPage] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  const activeTool = useCanvasStore(s => s.activeTool);
  const setActiveTool = useCanvasStore(s => s.setActiveTool);
  const openChat = useChatStore(s => s.openChat);

  // Canvas save debounce
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─────────────────────────────────────────────
  // Data loading
  // ─────────────────────────────────────────────

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/pages/${params.pageId}`);
    if (!res.ok) {
      setError('Page not found.');
      setLoading(false);
      return;
    }
    const json = (await res.json()) as { page: Page; notebook: Notebook };
    setPage(json.page);
    setNotebook(json.notebook);
    setLoading(false);
  }, [params.pageId]);

  const loadNotebookPages = useCallback(async () => {
    const res = await fetch(`/api/notebooks/${params.notebookId}/pages`);
    if (res.ok) {
      const json = (await res.json()) as { pages: Page[] };
      setNotebookPages(json.pages.map(p => ({ id: p.id, title: p.title })));
    }
  }, [params.notebookId]);

  useEffect(() => {
    loadPage();
    loadNotebookPages();
  }, [loadPage, loadNotebookPages]);

  // ─────────────────────────────────────────────
  // Generate lesson
  // ─────────────────────────────────────────────

  const handleGenerateLesson = async () => {
    if (!page) return;
    setGenerating(true);
    setError(null);
    const res = await fetch(`/api/pages/${page.id}/generate-lesson`, { method: 'POST' });
    if (res.ok) {
      const json = (await res.json()) as { lesson_content: PositionedLessonBlock[] };
      setPage(prev => prev ? { ...prev, lesson_content: json.lesson_content } : prev);
    } else {
      const err = ((await res.json().catch(() => ({}))) as { error?: string }).error;
      setError(err ?? 'Failed to generate lesson. Please try again.');
    }
    setGenerating(false);
  };

  // ─────────────────────────────────────────────
  // Canvas state save
  // ─────────────────────────────────────────────

  const scheduleCanvasSave = useCallback(() => {
    if (!page) return;
    setSaveStatus('unsaved');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      const canvasState = useCanvasStore.getState();
      await fetch(`/api/pages/${page.id}/canvas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strokes: canvasState.strokes,
          textNotes: canvasState.textNotes,
          annotations: [],
        }),
      });
      setSaveStatus('saved');
    }, 2000);
  }, [page]);

  // ─────────────────────────────────────────────
  // Create new page
  // ─────────────────────────────────────────────

  const handleCreatePage = async () => {
    if (!newPageTitle.trim()) return;
    setCreatingPage(true);
    const res = await fetch(`/api/notebooks/${params.notebookId}/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newPageTitle.trim() }),
    });
    if (res.ok) {
      const json = (await res.json()) as { page: Page };
      router.push(`/figma-canvas/${params.notebookId}/${json.page.id}`);
    }
    setCreatingPage(false);
    setShowNewPage(false);
    setNewPageTitle('');
  };

  // ─────────────────────────────────────────────
  // Loading / error states
  // ─────────────────────────────────────────────

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
        <button onClick={() => router.push('/figma-dashboard')} className="text-white text-sm underline">
          Back to dashboard
        </button>
      </div>
    );
  }

  const hasLesson = (page?.lesson_content?.length ?? 0) > 0;

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">

      {/* ── New Page Modal ── */}
      {showNewPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-black border border-white/30 rounded-xl p-6 w-96 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">New Page</h2>
              <button onClick={() => setShowNewPage(false)} className="text-white/50 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="border-b border-white/10 pb-2">
              <input type="text" placeholder="Page title" value={newPageTitle}
                onChange={e => setNewPageTitle(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none" autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreatePage()} />
            </div>
            <button onClick={handleCreatePage} disabled={creatingPage || !newPageTitle.trim()}
              className="w-full bg-white text-black text-sm font-medium py-2 rounded-md hover:bg-white/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              {creatingPage ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Create Page
            </button>
          </div>
        </div>
      )}

      {/* ── Primary Icon Sidebar ── */}
      <aside className="w-16 border-r border-white bg-black flex flex-col items-center py-4 shrink-0 z-20">
        <Link href="/figma-dashboard"
          className="mb-8 w-8 h-8 bg-white border border-white rounded flex items-center justify-center text-black text-xs font-bold hover:bg-white/90 transition-colors">
          IB
        </Link>
        <div className="flex-1 flex flex-col items-center space-y-6">
          <IconBtn icon={<Files />} label="Pages" active={showSecondary} onClick={() => setShowSecondary(v => !v)} />
          <IconBtn icon={<Search />} label="Search" />
          <IconBtn icon={<BookOpen />} label="Graph" onClick={() => router.push('/')} />
        </div>
        <div className="flex flex-col items-center space-y-6 mt-auto">
          <IconBtn icon={<Settings />} label="Settings" />
          <IconBtn icon={<Trash2 />} label="Trash" />
        </div>
      </aside>

      {/* ── Secondary Pages Sidebar ── */}
      {showSecondary && (
        <aside className="w-64 border-r border-white bg-black flex flex-col shrink-0 z-20">
          <div className="p-4 flex items-center justify-between border-b border-white">
            <div>
              <div className="text-xs text-white/50 mb-0.5">{notebook?.title}</div>
              <h2 className="font-semibold text-white text-sm">Pages</h2>
            </div>
            <button onClick={() => setShowNewPage(true)} className="text-white/70 hover:text-white transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {notebookPages.map((p, i) => (
              <Link key={p.id} href={`/figma-canvas/${params.notebookId}/${p.id}`}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  p.id === params.pageId
                    ? 'bg-white/10 border border-white/20'
                    : 'hover:bg-white/5 border border-transparent'
                }`}>
                <div className={`w-10 h-10 rounded border shrink-0 flex items-center justify-center text-xs font-medium ${
                  p.id === params.pageId ? 'border-white bg-white/5' : 'border-white/30 bg-black'
                }`}
                  style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '8px 8px' }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm truncate ${p.id === params.pageId ? 'text-white font-medium' : 'text-white/70'}`}>
                    {p.title}
                  </div>
                </div>
              </Link>
            ))}

            <button onClick={() => setShowNewPage(true)}
              className="w-full mt-2 flex items-center gap-2 justify-center py-2 border border-dashed border-white/30 hover:border-white/60 rounded-lg text-sm text-white/50 hover:text-white/80 transition-colors">
              <Plus className="w-4 h-4" />New page
            </button>
          </div>
        </aside>
      )}

      {/* ── Main Canvas Area ── */}
      <main className="flex-1 relative flex flex-col overflow-hidden bg-black"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }}>

        {/* ── Top Header ── */}
        <header className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-6 z-10 bg-gradient-to-b from-black via-black/90 to-transparent">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Link href="/figma-dashboard" className="hover:text-white transition-colors">
              {notebook?.title ?? '...'}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white font-medium">{page?.title ?? '...'}</span>
            <div className="ml-4 flex items-center gap-1.5 text-xs text-white/40">
              {saveStatus === 'saved' && <><CheckCircle2 className="w-3.5 h-3.5" />Saved</>}
              {saveStatus === 'saving' && <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</>}
              {saveStatus === 'unsaved' && <span>Unsaved</span>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tutor button */}
            <button onClick={() => openChat()}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-white/20 text-white/60 text-xs rounded-md hover:text-white hover:border-white/50 transition-colors">
              <MessageCircle className="w-3.5 h-3.5" />
              Ask Tutor
            </button>

            {/* Generate / Regenerate */}
            {!hasLesson ? (
              <button onClick={handleGenerateLesson} disabled={generating}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-black text-xs font-medium rounded-md hover:bg-white/90 disabled:opacity-50 transition-colors">
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {generating ? 'Generating…' : 'Generate Lesson'}
              </button>
            ) : (
              <button onClick={handleGenerateLesson} disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-white/20 text-white/50 text-xs rounded-md hover:text-white hover:border-white/40 disabled:opacity-50 transition-colors">
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Regenerate
              </button>
            )}

            <button className="bg-white text-black px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-white/90 transition-colors">
              <Share className="w-4 h-4" />Share
            </button>
          </div>
        </header>

        {/* ── Floating Toolbar ── */}
        <div className="absolute top-[72px] left-1/2 -translate-x-1/2 bg-black border border-white rounded-xl shadow-2xl px-2 py-1.5 flex items-center gap-1 z-20">
          <ToolbarBtn icon={<MousePointer2 />} active={activeTool === 'select'} onClick={() => setActiveTool('select')} title="Select (V)" />
          <ToolbarBtn icon={<PenTool />} active={activeTool === 'pen'} onClick={() => setActiveTool('pen')} title="Pen (P)" />
          <ToolbarBtn icon={<Highlighter />} active={activeTool === 'highlight'} onClick={() => setActiveTool('highlight')} title="Highlight (H)" />
          <ToolbarBtn icon={<Eraser />} active={activeTool === 'eraser'} onClick={() => setActiveTool('eraser')} title="Eraser (E)" />
          <ToolbarBtn icon={<Type />} active={activeTool === 'text'} onClick={() => setActiveTool('text')} title="Text (T)" />
          <div className="w-px h-6 bg-white/20 mx-1" />
          <ToolbarBtn icon={<Undo />} title="Undo" />
          <ToolbarBtn icon={<Redo />} title="Redo" />
          <ToolbarBtn icon={<MoreHorizontal />} title="More" />
        </div>

        {/* ── Canvas Content ── */}
        <div className="absolute inset-0 pt-14 overflow-auto">
          {error && (
            <div className="mx-8 mt-6 px-4 py-3 bg-red-950/40 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {!hasLesson && !generating && (
            <EmptyLessonState title={page?.title ?? ''} onGenerate={handleGenerateLesson} />
          )}

          {generating && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-white/30">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Building your lesson from the textbook…</p>
            </div>
          )}

          {hasLesson && !generating && page && (
            <LessonArea blocks={page.lesson_content} />
          )}
        </div>

        {/* ── Ink overlay (z-30, screen-space) ── */}
        <InkLayer />

        {/* ── Text note overlay (z-25, screen-space) ── */}
        <TextNoteLayer />

        {/* ── Bottom controls ── */}
        <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2">
          <div className="bg-black border border-white/30 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs text-white/60">
            <button className="hover:text-white transition-colors">-</button>
            <span>100%</span>
            <button className="hover:text-white transition-colors">+</button>
          </div>
          <div className="bg-black border border-white/30 rounded-lg overflow-hidden"
            style={{ width: 96, height: 64, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)', backgroundSize: '8px 8px' }}>
            <div className="w-full h-full flex items-center justify-center">
              <div className="border border-white/30 rounded" style={{ width: 32, height: 24 }}></div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Socratic Chat overlay ── */}
      <SocraticChat />
    </div>
  );
}

// ─────────────────────────────────────────────
// Icon button for primary sidebar
// ─────────────────────────────────────────────

function IconBtn({ icon, label, active = false, onClick }: {
  icon: React.ReactElement<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} title={label}
      className={`group relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
        active ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'
      }`}>
      {React.cloneElement(icon, { className: 'w-5 h-5' })}
    </button>
  );
}

// ─────────────────────────────────────────────
// Floating toolbar button
// ─────────────────────────────────────────────

function ToolbarBtn({ icon, active = false, onClick, title }: {
  icon: React.ReactElement<{ className?: string }>;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button onClick={onClick} title={title}
      className={`p-2 rounded-lg transition-colors ${
        active ? 'bg-white text-black' : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}>
      {React.cloneElement(icon, { className: 'w-4 h-4' })}
    </button>
  );
}

// ─────────────────────────────────────────────
// Empty lesson state
// ─────────────────────────────────────────────

function EmptyLessonState({ title, onGenerate }: { title: string; onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8" style={{ minHeight: '60vh' }}>
      <div className="w-64 h-48 border border-dashed border-white/20 rounded-xl flex items-center justify-center"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
        <BookOpen className="w-10 h-10 text-white/20" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-white mb-2">{title}</h2>
        <p className="text-white/40 text-sm max-w-sm">
          Let Savant generate a personalized lesson for this topic using your textbook.
        </p>
      </div>
      <button onClick={onGenerate}
        className="flex items-center gap-2 px-6 py-2.5 bg-white text-black font-medium text-sm rounded-md hover:bg-white/90 transition-colors">
        <Zap className="w-4 h-4" />Generate Lesson
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Lesson blocks renderer
// ─────────────────────────────────────────────

function LessonArea({ blocks }: { blocks: PositionedLessonBlock[] }) {
  const isMultiColumn = blocks.some(b => (b.x ?? 0) > 0);

  if (!isMultiColumn) {
    return (
      <div className="max-w-2xl mx-auto p-8 pb-32 space-y-6">
        {blocks.map(b => (
          <LessonBlockRenderer key={b.block.id} block={b.block} />
        ))}
      </div>
    );
  }

  const maxX = Math.max(...blocks.map(b => (b.x ?? 0) + (b.width ?? 680)));
  const maxY = Math.max(...blocks.map(b => (b.y ?? 0) + 300));

  return (
    <div className="relative mx-auto" style={{ width: maxX + 64, minHeight: maxY + 128, paddingTop: 48 }}>
      {blocks.map(b => (
        <div key={b.block.id} className="absolute" style={{ left: (b.x ?? 0) + 32, top: (b.y ?? 0) + 48, width: b.width ?? 680 }}>
          <LessonBlockRenderer block={b.block} />
        </div>
      ))}
    </div>
  );
}
