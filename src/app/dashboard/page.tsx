"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, Bell, Plus, ChevronDown, Book, FileText,
  Star, Users, Trash2, Crown, LayoutGrid, List, MoreVertical, X, Loader2,
} from "lucide-react";
import type { Notebook, Page } from "@/types";

const SUBJECT_EMOJIS: Record<string, string> = {
  physics: "⚛️", calculus: "∫", math: "∑", biology: "🧬",
  chemistry: "🧪", history: "📜", literature: "📖", computer: "💻",
  music: "🎵", art: "🎨", economics: "📈", psychology: "🧠",
};

function subjectEmoji(subject: string): string {
  const key = Object.keys(SUBJECT_EMOJIS).find((k) => subject.toLowerCase().includes(k));
  return key ? SUBJECT_EMOJIS[key] : "📓";
}

export default function DashboardPage() {
  const router = useRouter();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);

  const [showNewNotebook, setShowNewNotebook] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [creating, setCreating] = useState(false);

  const [showNewPage, setShowNewPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [creatingPage, setCreatingPage] = useState(false);

  const loadNotebooks = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/notebooks");
    if (res.ok) {
      const json = (await res.json()) as { notebooks: Notebook[] };
      const nbs = json.notebooks ?? [];
      setNotebooks(nbs);
      if (nbs.length > 0) setSelectedNotebook((prev) => prev ?? nbs[0]);
    }
    setLoading(false);
  }, []);

  const loadPages = useCallback(async (notebookId: string) => {
    const res = await fetch(`/api/notebooks/${notebookId}/pages`);
    if (res.ok) {
      const json = (await res.json()) as { pages: Page[] };
      setPages(json.pages ?? []);
    }
  }, []);

  useEffect(() => { loadNotebooks(); }, [loadNotebooks]);

  useEffect(() => {
    if (selectedNotebook) loadPages(selectedNotebook.id);
    else setPages([]);
  }, [selectedNotebook, loadPages]);

  const handleCreateNotebook = async () => {
    if (!newTitle.trim() || !newSubject.trim()) return;
    setCreating(true);
    const emoji = subjectEmoji(newSubject);
    const res = await fetch("/api/notebooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), subject: newSubject.trim(), emoji }),
    });
    if (res.ok) {
      const json = (await res.json()) as { notebook: Notebook };
      setNotebooks((prev) => [...prev, json.notebook]);
      setSelectedNotebook(json.notebook);
      setPages([]);
    }
    setCreating(false);
    setShowNewNotebook(false);
    setNewTitle("");
    setNewSubject("");
  };

  const handleCreatePage = async () => {
    if (!newPageTitle.trim() || !selectedNotebook) return;
    setCreatingPage(true);
    const res = await fetch(`/api/notebooks/${selectedNotebook.id}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newPageTitle.trim() }),
    });
    if (res.ok) {
      const json = (await res.json()) as { page: Page };
      router.push(`/notebook/${selectedNotebook.id}/page/${json.page.id}`);
    }
    setCreatingPage(false);
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">

      {showNewNotebook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-black border border-white/30 rounded-xl p-6 w-96 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">New Notebook</h2>
              <button onClick={() => setShowNewNotebook(false)} className="text-white/50 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="border-b border-white/10 pb-2">
                <input
                  type="text"
                  placeholder="Notebook title (e.g. Physics 201)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none"
                  autoFocus
                />
              </div>
              <div className="border-b border-white/10 pb-2">
                <input
                  type="text"
                  placeholder="Subject (e.g. physics, calculus)"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateNotebook()}
                />
              </div>
            </div>
            <button
              onClick={handleCreateNotebook}
              disabled={creating || !newTitle.trim() || !newSubject.trim()}
              className="w-full bg-white text-black text-sm font-medium py-2 rounded-md hover:bg-white/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Create Notebook
            </button>
          </div>
        </div>
      )}

      {showNewPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-black border border-white/30 rounded-xl p-6 w-96 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                New Page {selectedNotebook ? `in ${selectedNotebook.title}` : ""}
              </h2>
              <button onClick={() => setShowNewPage(false)} className="text-white/50 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="border-b border-white/10 pb-2">
              <input
                type="text"
                placeholder="Page title (e.g. Projectile Motion)"
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreatePage()}
              />
            </div>
            {!selectedNotebook && (
              <p className="text-xs text-white/40">Select a notebook first.</p>
            )}
            <button
              onClick={handleCreatePage}
              disabled={creatingPage || !newPageTitle.trim() || !selectedNotebook}
              className="w-full bg-white text-black text-sm font-medium py-2 rounded-md hover:bg-white/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {creatingPage ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Create &amp; Open Page
            </button>
          </div>
        </div>
      )}

      <aside className="w-64 border-r border-white/20 bg-black flex flex-col shrink-0">
        <div className="p-4 border-b border-white/20">
          <Link href="/" className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-white border border-white rounded flex items-center justify-center text-black text-[10px] font-bold">
              IB
            </div>
            <span className="font-medium text-white">Savant</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 border border-white/40 rounded flex items-center justify-center text-xs">S</div>
            <div>
              <div className="text-sm font-medium text-white">My Workspace</div>
              <div className="text-xs text-white/50">Personal</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          <div>
            <div className="text-xs font-semibold text-white/40 mb-2 px-3 tracking-wider">WORKSPACE</div>
            <nav className="space-y-0.5">
              <SidebarItem icon={<Book className="w-4 h-4" />} label="Notebooks" active />
              <SidebarItem icon={<FileText className="w-4 h-4" />} label="All Pages" />
              <SidebarItem icon={<Star className="w-4 h-4" />} label="Favorites" />
              <SidebarItem icon={<Users className="w-4 h-4" />} label="Shared with me" />
              <SidebarItem icon={<Trash2 className="w-4 h-4" />} label="Trash" />
            </nav>
          </div>

          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <div className="text-xs font-semibold text-white/40 tracking-wider">NOTEBOOKS</div>
              <button onClick={() => setShowNewNotebook(true)} className="text-white/50 hover:text-white transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <nav className="space-y-0.5">
              {loading ? (
                <div className="px-3 py-2 flex items-center gap-2 text-white/30 text-sm">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
                </div>
              ) : notebooks.length === 0 ? (
                <button
                  onClick={() => setShowNewNotebook(true)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" /><span>Create first notebook</span>
                </button>
              ) : (
                notebooks.map((nb) => (
                  <button
                    key={nb.id}
                    onClick={() => setSelectedNotebook(nb)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedNotebook?.id === nb.id
                        ? "bg-white/10 text-white"
                        : "text-white/50 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <span>{nb.emoji}</span>
                    <span className="truncate">{nb.title}</span>
                  </button>
                ))
              )}
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-white/20">
          <div className="bg-black border border-white/20 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">Upgrade to Pro</span>
            </div>
            <p className="text-xs text-white/50 mb-3">Unlock unlimited notebooks, offline mode, and more.</p>
            <button className="w-full bg-white text-black text-sm font-medium py-1.5 rounded-md hover:bg-gray-200 transition-colors">
              Go Pro
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-white/20 flex items-center justify-between px-6 bg-black">
          <div className="relative w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search notebooks, pages, or tags..."
              className="w-full bg-black border border-white/20 rounded-md pl-9 pr-12 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/40 transition-colors"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 border border-white/20 rounded px-1.5 py-0.5">
              Ctrl K
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowNewNotebook(true)}
              className="bg-white text-black px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 hover:bg-gray-200 transition-colors"
            >
              <Plus className="w-4 h-4" /> New <ChevronDown className="w-3 h-3 ml-1" />
            </button>
            <button className="relative text-white/50 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <Link href="/learn" className="text-xs text-white/50 hover:text-white transition-colors border border-white/20 px-3 py-1.5 rounded-md">
              Constellation
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">
                    {selectedNotebook ? selectedNotebook.title : "Notebooks"}
                  </h1>
                  <p className="text-white/50 text-sm">
                    {selectedNotebook
                      ? `${selectedNotebook.subject} · ${pages.length} pages`
                      : "Organize your ideas. Create without limits."}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowNewNotebook(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-white/20 rounded-md text-sm font-medium hover:bg-white/10 transition-colors"
                  >
                    <Plus className="w-4 h-4 text-white" /> New Notebook
                  </button>
                  <button
                    onClick={() => setShowNewPage(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> New Page
                  </button>
                </div>
              </div>

              {notebooks.length > 0 && (
                <div className="flex items-center gap-2 border-b border-white/20 pb-px overflow-x-auto">
                  {notebooks.map((nb) => (
                    <Tab key={nb.id} active={selectedNotebook?.id === nb.id} onClick={() => setSelectedNotebook(nb)}>
                      {nb.emoji} {nb.title}
                    </Tab>
                  ))}
                </div>
              )}
            </div>

            {selectedNotebook && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-white">Pages</h2>
                    <span className="text-xs text-white/30">{pages.length} pages</span>
                  </div>
                  <div className="flex items-center gap-1 border border-white/20 rounded-md p-0.5">
                    <button className="p-1 bg-white text-black rounded"><LayoutGrid className="w-4 h-4" /></button>
                    <button className="p-1 hover:text-white rounded text-white/50"><List className="w-4 h-4" /></button>
                  </div>
                </div>

                {pages.length === 0 ? (
                  <div className="border border-dashed border-white/20 rounded-xl p-12 text-center">
                    <p className="text-white/40 text-sm mb-4">No pages yet in this notebook.</p>
                    <button
                      onClick={() => setShowNewPage(true)}
                      className="bg-white text-black text-sm font-medium px-4 py-2 rounded-md hover:bg-white/90 transition-colors"
                    >
                      Create first page
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {pages.map((page) => (
                      <PageCard
                        key={page.id}
                        title={page.title}
                        category={selectedNotebook.title}
                        time={formatRelative(page.updated_at)}
                        hasLesson={page.lesson_content.length > 0}
                        href={`/notebook/${selectedNotebook.id}/page/${page.id}`}
                      />
                    ))}
                    <button
                      onClick={() => setShowNewPage(true)}
                      className="border border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center gap-2 h-52 text-white/30 hover:text-white/60 hover:border-white/40 transition-colors"
                    >
                      <Plus className="w-6 h-6" /><span className="text-sm">New page</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {!loading && notebooks.length === 0 && (
              <div className="text-center py-24">
                <p className="text-white/30 text-sm mb-6">Your workspace is empty. Create your first notebook to begin.</p>
                <button
                  onClick={() => setShowNewNotebook(true)}
                  className="bg-white text-black text-sm font-medium px-6 py-2.5 rounded-md hover:bg-white/90 transition-colors"
                >
                  Create Notebook
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-white text-black font-medium" : "text-white/50 hover:text-white hover:bg-white/10"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Tab({
  children, active = false, onClick,
}: {
  children: React.ReactNode; active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active ? "border-white text-white" : "border-transparent text-white/50 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function PageCard({
  title, category, time, hasLesson = false, href,
}: {
  title: string; category: string; time: string; hasLesson?: boolean; href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-black border border-white/20 hover:border-white/60 rounded-xl overflow-hidden flex flex-col group cursor-pointer transition-colors"
    >
      <div
        className="h-32 bg-black relative border-b border-white/20"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
          backgroundSize: "16px 16px",
        }}
      >
        {hasLesson && (
          <div className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded bg-white text-black font-medium">
            Lesson ready
          </div>
        )}
        <button className="absolute top-2 right-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <Star className="w-4 h-4" />
        </button>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-sm font-medium text-white truncate pr-2">{title}</h3>
          <button className="text-white/50 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between text-xs text-white/30">
          <span>{category}</span>
          <span>Edited {time}</span>
        </div>
      </div>
    </Link>
  );
}
