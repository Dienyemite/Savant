"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Plus, ChevronDown, Book, FileText,
  Star, Users, Trash2, ArrowUpRight, Pin,
  LayoutGrid, List, X, Loader2, Check, MoreVertical,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";
import type { Notebook, Page } from "@/types";
import type { User } from "@supabase/supabase-js";

type SortKey = "last_edited" | "title" | "created";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins || 1}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function userInitials(user: User): string {
  const name: string =
    (user.user_metadata?.display_name as string | undefined) ||
    (user.email ?? "");
  return (
    name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("") || "U"
  );
}

function CustomCursor() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const updateMousePos = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      const target = e.target as HTMLElement;
      const isClickable =
        target.tagName.toLowerCase() === "a" ||
        target.tagName.toLowerCase() === "button" ||
        !!target.closest("a") ||
        !!target.closest("button");
      setIsHovering(isClickable);
    };
    window.addEventListener("mousemove", updateMousePos);
    return () => window.removeEventListener("mousemove", updateMousePos);
  }, []);

  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference flex items-center justify-center"
      animate={{
        x: mousePos.x - (isHovering ? 24 : 12),
        y: mousePos.y - (isHovering ? 24 : 12),
        width: isHovering ? 48 : 24,
        height: isHovering ? 48 : 24,
      }}
      transition={{ type: "spring", stiffness: 800, damping: 35, mass: 0.2 }}
    >
      <motion.div
        className="w-full h-full border border-white rounded-full"
        animate={{ scale: isHovering ? 1.1 : 1 }}
        transition={{ duration: 0.2 }}
      />
      <AnimatePresence>
        {isHovering && (
          <motion.div
            className="absolute w-1 h-1 bg-white rounded-full"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function BackgroundCircles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center opacity-30">
      <motion.div
        className="absolute w-[800px] h-[800px] border-[0.5px] border-white/20 rounded-full border-dashed"
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute w-[1400px] h-[1400px] border-[0.5px] border-white/10 rounded-full"
        animate={{ rotate: -360 }}
        transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] border-[0.5px] border-white/30 rounded-full"
        animate={{ scale: [1, 1.05, 1], rotate: 180 }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="absolute top-0 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full blur-[2px]" />
      </motion.div>
    </div>
  );
}

export default function FigmaDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [allPages, setAllPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("last_edited");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showNotebookModal, setShowNotebookModal] = useState(false);
  const [showPageModal, setShowPageModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ pageId: string; x: number; y: number } | null>(null);
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      setUser(user);
    }
    checkUser();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const nbRes = await fetch("/api/notebooks");
      if (!nbRes.ok) return;
      const { notebooks: nbs } = (await nbRes.json()) as { notebooks: Notebook[] };
      setNotebooks(nbs);
      const pageArrays = await Promise.all(
        nbs.map((nb) =>
          fetch(`/api/notebooks/${nb.id}/pages`)
            .then((r) => (r.ok ? (r.json() as Promise<{ pages: Page[] }>) : { pages: [] as Page[] }))
            .then((d) => d.pages)
        )
      );
      setAllPages(pageArrays.flat());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSearchQuery("");
        searchRef.current?.blur();
        setContextMenu(null);
        setShowSortMenu(false);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node))
        setShowSortMenu(false);
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node))
        setContextMenu(null);
      if (showUserMenu) setShowUserMenu(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showUserMenu]);

  const displayedPages = useMemo(() => {
    let pages = activeNotebookId
      ? allPages.filter((p) => p.notebook_id === activeNotebookId)
      : allPages;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      pages = pages.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.topic?.toLowerCase().includes(q)
      );
    }
    return [...pages].sort((a, b) => {
      if (sortKey === "title") return a.title.localeCompare(b.title);
      if (sortKey === "created")
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [allPages, activeNotebookId, searchQuery, sortKey]);

  const recentPages = useMemo(
    () =>
      [...allPages]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5),
    [allPages]
  );

  const favoritePages = useMemo(
    () => allPages.filter((p) => p.is_favorited).slice(0, 4),
    [allPages]
  );

  function notebookFor(page: Page) {
    return notebooks.find((n) => n.id === page.notebook_id);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function togglePin(page: Page) {
    const next = !page.is_pinned;
    setAllPages((ps) => ps.map((p) => (p.id === page.id ? { ...p, is_pinned: next } : p)));
    await fetch(`/api/pages/${page.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_pinned: next }),
    });
  }

  async function toggleStar(page: Page) {
    const next = !page.is_favorited;
    setAllPages((ps) => ps.map((p) => (p.id === page.id ? { ...p, is_favorited: next } : p)));
    await fetch(`/api/pages/${page.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_favorited: next }),
    });
  }

  async function renamePage(pageId: string, title: string) {
    if (!title.trim()) { setRenamingPageId(null); return; }
    setAllPages((ps) => ps.map((p) => (p.id === pageId ? { ...p, title } : p)));
    setRenamingPageId(null);
    await fetch(`/api/pages/${pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  }

  async function deletePage(pageId: string) {
    setAllPages((ps) => ps.filter((p) => p.id !== pageId));
    setContextMenu(null);
    await fetch(`/api/pages/${pageId}`, { method: "DELETE" });
  }

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    router.push("/onboarding");
  }

  const sortLabels: Record<SortKey, string> = {
    last_edited: "Chronological",
    title: "Title",
    created: "Created",
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden relative cursor-none font-serif select-none">
      <CustomCursor />
      <BackgroundCircles />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white text-black text-[10px] uppercase tracking-[0.2em] px-6 py-3 shadow-lg">
          {toast}
        </div>
      )}

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-black border border-white/20 shadow-xl py-1 min-w-[140px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="w-full text-left px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white hover:bg-white/10"
            onClick={() => {
              const page = allPages.find((p) => p.id === contextMenu.pageId);
              if (page) { setRenamingPageId(page.id); setRenameValue(page.title); }
              setContextMenu(null);
            }}
          >
            Rename
          </button>
          <button
            className="w-full text-left px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => deletePage(contextMenu.pageId)}
          >
            Delete
          </button>
        </div>
      )}

      {/* Left Nav */}
      <nav className="w-[320px] border-r border-white/10 relative z-10 flex flex-col bg-black/50 backdrop-blur-md flex-shrink-0">
        <div className="absolute left-[72px] top-0 bottom-0 w-[1px] bg-white/10" />

        <div className="p-12 relative z-10 border-b border-white/10">
          <Link href="/" className="flex items-center gap-6 group cursor-none">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <motion.div
                className="absolute inset-0 border-[0.5px] border-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              />
              <span className="text-[10px] uppercase tracking-widest text-white">IB</span>
            </div>
            <span className="text-xl italic tracking-[0.2em] uppercase text-white font-light">Savant</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-12 flex flex-col gap-8">
          <NavItem icon={<Book />} label="Notebooks" active />
          <NavItem icon={<FileText />} label="All Pages" />
          <NavItem icon={<Star />} label="Favorites" />
          <NavItem icon={<Users />} label="Shared" />
          <NavItem icon={<Trash2 />} label="Trash" />

          <div className="mt-12 pt-8">
            <div className="text-[9px] uppercase tracking-[0.4em] text-white/30 mb-8 pl-[120px]">Classes</div>
            <div className="flex flex-col gap-6 pl-[68px]">
              {loading ? (
                <div className="text-[10px] italic text-white/30 tracking-widest">Loading…</div>
              ) : (
                <>
                  {notebooks.map((nb) => (
                    <ClassItem
                      key={nb.id}
                      label={nb.title}
                      pages={allPages.filter((p) => p.notebook_id === nb.id).length}
                      active={activeNotebookId === nb.id}
                      onClick={() => setActiveNotebookId(nb.id === activeNotebookId ? null : nb.id)}
                    />
                  ))}
                  <button
                    onClick={() => setShowNotebookModal(true)}
                    className="group flex items-center gap-6 cursor-none text-white/30 hover:text-white transition-colors"
                  >
                    <div className="w-1.5 h-1.5 rounded-full border border-white/30 group-hover:bg-white transition-colors" />
                    <span className="text-[10px] italic tracking-[0.1em]">Add class</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-white/10 relative z-10">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex items-center gap-6 group cursor-none pl-4 w-full"
            >
              <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
                <motion.div
                  className="absolute inset-0 rounded-full border border-white/20 group-hover:border-white transition-colors"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
                <div className="w-10 h-10 rounded-full bg-black border border-white/30 flex items-center justify-center text-[10px] uppercase tracking-widest text-white">
                  {user ? userInitials(user) : "U"}
                </div>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white">
                  {(user?.user_metadata?.display_name as string | undefined) ??
                    user?.email?.split("@")[0] ??
                    "Student"}
                </span>
                <span className="text-[9px] italic text-white/50 tracking-widest mt-1">
                  {user?.email ?? ""}
                </span>
              </div>
            </button>
            {showUserMenu && (
              <div className="absolute bottom-14 left-0 right-0 bg-black border border-white/20 shadow-xl py-1 z-50">
                <button
                  onClick={signOut}
                  className="w-full text-left px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white hover:bg-white/10"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="h-[120px] border-b border-white/10 flex items-center justify-between px-16 relative bg-transparent flex-shrink-0">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.3em] text-white/40">
              <span>Workspace</span>
              <div className="w-12 h-[1px] bg-white/20" />
              <span className="text-white">
                {(user?.user_metadata?.display_name as string | undefined) ??
                  user?.email?.split("@")[0] ??
                  "Student"}
              </span>
            </div>
            <div className="relative w-[400px] mt-2">
              <motion.div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-white/30 pointer-events-none"
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              >
                <div className="absolute top-0 left-1/2 w-1 h-1 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
              </motion.div>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SEARCH ARCHIVES..."
                className="w-full bg-transparent border-b border-white/20 pl-12 pr-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white focus:outline-none focus:border-white transition-colors placeholder:text-white/30 cursor-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-12">
            <button
              onClick={() => setShowPageModal(true)}
              className="text-[9px] uppercase tracking-[0.3em] border border-white px-8 py-3 hover:bg-white hover:text-black transition-colors flex items-center gap-4 cursor-none group"
            >
              <div className="relative w-4 h-4 flex items-center justify-center">
                <motion.div
                  className="absolute inset-0 rounded-full border border-current"
                  animate={{ rotate: 90 }}
                  whileHover={{ rotate: 180 }}
                />
                <Plus className="w-2.5 h-2.5" />
              </div>
              New Entry
            </button>
            <button className="relative text-white/50 hover:text-white transition-colors cursor-none">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 border border-black bg-white rounded-full" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-16">
          <div className="max-w-[1400px] mx-auto space-y-32">
            {/* Title + Tabs */}
            <div className="flex items-end justify-between border-b border-white/10 pb-16 relative">
              <div className="absolute -left-12 -top-12 w-64 h-64 border-[0.5px] border-white/5 rounded-full pointer-events-none" />
              <div>
                <h1 className="text-8xl italic text-white mb-8 font-light tracking-wide leading-none">
                  Notebooks
                </h1>
                <p className="text-white/50 uppercase tracking-[0.4em] text-[10px]">
                  Organize your ideas. Create without limits.
                </p>
              </div>
              <div className="flex items-center gap-12 text-[10px] uppercase tracking-[0.2em] overflow-x-auto">
                <DashTab
                  active={activeNotebookId === null}
                  onClick={() => setActiveNotebookId(null)}
                >
                  All Entries
                </DashTab>
                {notebooks.map((nb) => (
                  <DashTab
                    key={nb.id}
                    active={activeNotebookId === nb.id}
                    onClick={() => setActiveNotebookId(nb.id)}
                  >
                    {nb.title}
                  </DashTab>
                ))}
              </div>
            </div>

            {/* Pages Grid */}
            <div>
              <div className="flex items-center justify-between mb-16">
                <div className="flex items-center gap-8">
                  <h2 className="text-[10px] uppercase tracking-[0.4em] text-white">
                    Index Overview
                  </h2>
                  <div className="w-16 h-[1px] bg-white/20" />
                  <span className="text-[10px] italic text-white/50 tracking-widest">
                    {displayedPages.length} Items
                  </span>
                </div>
                <div className="flex items-center gap-8 text-[10px] uppercase tracking-[0.2em] text-white/50">
                  <div className="relative" ref={sortMenuRef}>
                    <button
                      onClick={() => setShowSortMenu((v) => !v)}
                      className="hover:text-white transition-colors cursor-none flex items-center gap-3"
                    >
                      Sort: {sortLabels[sortKey]}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {showSortMenu && (
                      <div className="absolute right-0 top-7 bg-black border border-white/20 shadow-xl py-1 min-w-[160px] z-30">
                        {(Object.entries(sortLabels) as [SortKey, string][]).map(([k, label]) => (
                          <button
                            key={k}
                            onClick={() => { setSortKey(k); setShowSortMenu(false); }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white hover:bg-white/10"
                          >
                            {sortKey === k ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 inline-block" />}
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`cursor-none transition-colors ${viewMode === "grid" ? "text-white" : "hover:text-white"}`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`cursor-none transition-colors ${viewMode === "list" ? "text-white" : "hover:text-white"}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-px bg-white/10 border border-white/10">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-black h-96 animate-pulse opacity-20" />
                  ))}
                </div>
              ) : displayedPages.length === 0 ? (
                <div className="text-center py-32 text-white/30">
                  <p className="text-[10px] uppercase tracking-[0.4em] mb-8">No pages yet</p>
                  <button
                    onClick={() => setShowPageModal(true)}
                    className="text-[10px] uppercase tracking-[0.3em] border border-white/30 px-8 py-3 hover:bg-white hover:text-black transition-colors cursor-none"
                  >
                    Create your first page
                  </button>
                </div>
              ) : (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-px bg-white/10 border border-white/10"
                      : "flex flex-col gap-px bg-white/10 border border-white/10"
                  }
                >
                  {displayedPages.map((page) => (
                    <DashPageCard
                      key={page.id}
                      page={page}
                      notebook={notebookFor(page)}
                      viewMode={viewMode}
                      onPin={() => togglePin(page)}
                      onStar={() => toggleStar(page)}
                      onContextMenu={(x, y) => setContextMenu({ pageId: page.id, x, y })}
                      isRenaming={renamingPageId === page.id}
                      renameValue={renameValue}
                      onRenameChange={setRenameValue}
                      onRenameCommit={() => renamePage(page.id, renameValue)}
                      onRenameCancel={() => setRenamingPageId(null)}
                      onClick={() => router.push(`/figma-canvas/${page.notebook_id}/${page.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Widgets */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-px bg-white/10 border border-white/10">
              <DashWidget title="Recent Notes">
                <div className="flex flex-col">
                  {recentPages.length === 0 ? (
                    <p className="text-[10px] italic text-white/30 tracking-widest py-4">No pages yet.</p>
                  ) : (
                    recentPages.map((page) => (
                      <MinimalListItem
                        key={page.id}
                        title={page.title}
                        meta={`${notebookFor(page)?.title ?? "Notebook"} • ${relativeTime(page.updated_at)}`}
                        icon={<FileText className="w-4 h-4" />}
                        activePin={page.is_pinned}
                        onPin={() => togglePin(page)}
                        onClick={() => router.push(`/figma-canvas/${page.notebook_id}/${page.id}`)}
                      />
                    ))
                  )}
                </div>
              </DashWidget>

              <DashWidget title="Starred Locations">
                <div className="flex flex-col">
                  {favoritePages.length === 0 ? (
                    <p className="text-[10px] italic text-white/30 tracking-widest py-4">No favorites yet.</p>
                  ) : (
                    favoritePages.map((page) => (
                      <MinimalListItem
                        key={page.id}
                        title={page.title}
                        meta={`${notebookFor(page)?.title ?? "Notebook"} • ${relativeTime(page.updated_at)}`}
                        icon={<Star className="w-4 h-4" />}
                        activePin={page.is_favorited}
                        onPin={() => toggleStar(page)}
                        onClick={() => router.push(`/figma-canvas/${page.notebook_id}/${page.id}`)}
                      />
                    ))
                  )}
                </div>
              </DashWidget>

              <DashWidget title="System Activity">
                <div className="flex flex-col gap-2">
                  {recentPages.length === 0 ? (
                    <p className="text-[10px] italic text-white/30 tracking-widest py-4">No activity yet.</p>
                  ) : (
                    recentPages.map((page) => (
                      <ActivityItem
                        key={page.id}
                        user={
                          (user?.user_metadata?.display_name as string | undefined) ??
                          user?.email?.split("@")[0] ??
                          "You"
                        }
                        action="edited"
                        target={page.title}
                        time={relativeTime(page.updated_at)}
                        initials={user ? userInitials(user) : "U"}
                      />
                    ))
                  )}
                </div>
              </DashWidget>
            </div>
          </div>
        </div>
      </main>

      {showNotebookModal && (
        <CreateNotebookModal
          onClose={() => setShowNotebookModal(false)}
          onCreate={(nb) => {
            setNotebooks((prev) => [nb, ...prev]);
            setActiveNotebookId(nb.id);
            setShowNotebookModal(false);
            showToast("Notebook created");
          }}
        />
      )}

      {showPageModal && (
        <CreatePageModal
          notebooks={notebooks}
          defaultNotebookId={activeNotebookId ?? notebooks[0]?.id}
          onClose={() => setShowPageModal(false)}
          onCreate={(notebookId, page) => {
            setAllPages((prev) => [...prev, page]);
            setShowPageModal(false);
            router.push(`/figma-canvas/${notebookId}/${page.id}`);
          }}
        />
      )}
    </div>
  );
}

// ─── Sidebar components ────────────────────────────────────────────────────────

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div className="relative flex items-center gap-8 group cursor-none w-full">
      <div className="absolute left-[72px] w-8 h-[1px] bg-white/20 group-hover:w-16 transition-all duration-500" />
      <div className="relative z-10 w-12 h-12 flex items-center justify-center ml-[48px] flex-shrink-0">
        <motion.div
          className={`absolute inset-0 rounded-full border ${active ? "border-white" : "border-transparent group-hover:border-white/30"}`}
          animate={{ scale: active ? 1 : 0.8, rotate: active ? 180 : 0 }}
          transition={{ duration: 0.5 }}
        />
        {active && (
          <motion.div
            className="absolute inset-[-6px] rounded-full border border-dashed border-white/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          />
        )}
        <div className={`relative z-10 ${active ? "text-white" : "text-white/50 group-hover:text-white transition-colors"}`}>
          {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-4 h-4" })}
        </div>
      </div>
      <span className={`text-[10px] uppercase tracking-[0.3em] ${active ? "text-white" : "text-white/50 group-hover:text-white transition-colors"}`}>
        {label}
      </span>
    </div>
  );
}

function ClassItem({ label, pages, active, onClick }: { label: string; pages: number; active?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group cursor-none flex items-center gap-6 relative"
    >
      <div className="absolute -left-[4px] w-0 h-px bg-white group-hover:w-6 transition-all duration-300" />
      <div className={`w-1.5 h-1.5 rounded-full border flex-shrink-0 z-10 bg-black transition-colors ${active ? "bg-white border-white" : "border-white/30 group-hover:bg-white"}`} />
      <span className={`text-[10px] italic tracking-[0.1em] transition-colors flex-1 truncate ${active ? "text-white" : "text-white/70 group-hover:text-white"}`}>
        {label}
      </span>
      <span className="text-[9px] uppercase tracking-widest text-white/30 flex-shrink-0">
        {pages} P
      </span>
    </div>
  );
}

// ─── Main content components ───────────────────────────────────────────────────

function DashTab({ children, active = false, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`pb-4 text-[10px] uppercase tracking-[0.3em] transition-all relative group cursor-none shrink-0 ${active ? "text-white" : "text-white/40 hover:text-white"}`}
    >
      {children}
      <div className={`absolute bottom-0 left-0 right-0 h-[1px] transition-colors duration-500 ${active ? "bg-white" : "bg-transparent group-hover:bg-white/30"}`} />
    </button>
  );
}

function DashPageCard({
  page,
  notebook,
  viewMode,
  onPin,
  onStar,
  onContextMenu,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  onClick,
}: {
  page: Page;
  notebook: Notebook | undefined;
  viewMode: "grid" | "list";
  onPin: () => void;
  onStar: () => void;
  onContextMenu: (x: number, y: number) => void;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (v: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  onClick: () => void;
}) {
  if (viewMode === "list") {
    return (
      <div
        onClick={onClick}
        className="group bg-black relative flex items-center gap-8 px-10 py-6 cursor-none hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-[9px] uppercase tracking-[0.4em] px-4 py-2 border border-white/20 text-white/70 bg-black shrink-0">
          {page.topic ?? "Note"}
        </span>
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onKeyDown={(e) => { e.key === "Enter" && onRenameCommit(); e.key === "Escape" && onRenameCancel(); }}
              onBlur={onRenameCommit}
              onClick={(e) => e.stopPropagation()}
              className="text-lg italic text-white bg-transparent border-b border-white focus:outline-none w-full font-light"
            />
          ) : (
            <h3 className="text-lg italic text-white font-light truncate">{page.title}</h3>
          )}
        </div>
        <div className="text-[9px] uppercase tracking-[0.3em] text-white/50 shrink-0">
          {notebook?.title ?? ""}
        </div>
        <div className="text-[9px] uppercase tracking-[0.3em] text-white/30 shrink-0">
          {relativeTime(page.updated_at)}
        </div>
        <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onPin(); }} className="cursor-none text-white/50 hover:text-white">
            <Pin className={`w-3 h-3 ${page.is_pinned ? "fill-current text-white" : ""}`} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onStar(); }} className="cursor-none text-white/50 hover:text-white">
            <Star className={`w-3 h-3 ${page.is_favorited ? "fill-current text-white" : ""}`} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onContextMenu(e.clientX, e.clientY); }} className="cursor-none text-white/50 hover:text-white">
            <MoreVertical className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="group bg-black relative overflow-hidden h-96 flex flex-col cursor-none"
    >
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.02] transition-colors duration-500 z-0" />
      <motion.div
        className="absolute -right-32 -top-32 w-80 h-80 rounded-full border-[0.5px] border-white/10 group-hover:border-white/30"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute top-1/4 left-0 w-1.5 h-1.5 bg-white/30 rounded-full" />
      </motion.div>

      <div className="flex-1 p-10 relative z-10 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between mb-12">
            <span className="text-[9px] uppercase tracking-[0.4em] px-4 py-2 border border-white/20 text-white/70 bg-black">
              {page.topic ?? "Note"}
            </span>
            <div className="flex items-center gap-3">
              {page.is_pinned ? (
                <div
                  onClick={(e) => { e.stopPropagation(); onPin(); }}
                  className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center cursor-none"
                >
                  <Pin className="w-3 h-3 text-white fill-current" />
                </div>
              ) : (
                <div
                  onClick={(e) => { e.stopPropagation(); onPin(); }}
                  className="w-8 h-8 rounded-full border border-white/0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-none"
                >
                  <Pin className="w-3 h-3 text-white/50" />
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onContextMenu(e.clientX, e.clientY); }}
                className="w-8 h-8 rounded-full border border-white/0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-none text-white/50 hover:text-white"
              >
                <MoreVertical className="w-3 h-3" />
              </button>
            </div>
          </div>
          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onKeyDown={(e) => { e.key === "Enter" && onRenameCommit(); e.key === "Escape" && onRenameCancel(); }}
              onBlur={onRenameCommit}
              onClick={(e) => e.stopPropagation()}
              className="text-4xl italic text-white bg-transparent border-b border-white focus:outline-none w-full font-light leading-tight"
            />
          ) : (
            <h3 className="text-4xl italic text-white leading-tight mb-4 group-hover:translate-x-3 transition-transform duration-500 font-light">
              {page.title}
            </h3>
          )}
        </div>

        <div className="flex items-end justify-between pt-8 border-t border-white/10 relative">
          <div className="absolute left-0 top-0 w-0 h-[1px] bg-white group-hover:w-full transition-all duration-700" />
          <div className="text-[9px] uppercase tracking-[0.3em] text-white/50">
            <div className="mb-3 text-white/70">{notebook?.title ?? ""}</div>
            <div>{relativeTime(page.updated_at)}</div>
          </div>
          <div className="relative w-12 h-12 flex items-center justify-center rounded-full border border-white/20 group-hover:bg-white transition-colors duration-500 flex-shrink-0">
            <ArrowUpRight className="w-4 h-4 text-white group-hover:text-black relative z-10 transition-colors duration-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DashWidget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-black p-10 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 border-l border-b border-white/5 flex items-center justify-center pointer-events-none">
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-white/20"
          whileHover={{ scale: 2, backgroundColor: "#fff" }}
        />
      </div>
      <h3 className="text-xl italic text-white mb-10 flex items-center justify-between font-light">
        {title}
        <span className="text-[9px] uppercase tracking-[0.3em] not-italic border-b border-white/30 cursor-none hover:border-white transition-colors">
          View All
        </span>
      </h3>
      {children}
    </div>
  );
}

function MinimalListItem({
  title,
  meta,
  icon,
  activePin,
  onPin,
  onClick,
}: {
  title: string;
  meta: string;
  icon: React.ReactNode;
  activePin?: boolean;
  onPin?: () => void;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between py-5 border-b border-white/10 group cursor-none hover:border-white/50 transition-colors"
    >
      <div className="flex items-center gap-6">
        <div className="w-10 h-10 flex items-center justify-center relative flex-shrink-0">
          <motion.div
            className="absolute inset-0 rounded-full border border-white/10 group-hover:border-white/50"
            whileHover={{ scale: 1.1, rotate: 90 }}
            transition={{ type: "spring" }}
          />
          <div className="text-white/50 group-hover:text-white transition-colors">{icon}</div>
        </div>
        <div>
          <div className="text-lg italic text-white group-hover:translate-x-2 transition-transform duration-500 font-light">
            {title}
          </div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-white/30 mt-2">{meta}</div>
        </div>
      </div>
      {onPin && (
        <button
          onClick={(e) => { e.stopPropagation(); onPin(); }}
          className="cursor-none"
        >
          <Pin className={`w-3 h-3 ${activePin ? "text-white/60" : "text-white/20"}`} />
        </button>
      )}
    </div>
  );
}

function ActivityItem({
  user,
  action,
  target,
  time,
  initials,
}: {
  user: string;
  action: string;
  target: string;
  time: string;
  initials: string;
}) {
  return (
    <div className="flex items-start gap-6 group cursor-none py-4">
      <div className="relative w-10 h-10 flex-shrink-0">
        <motion.div
          className="absolute inset-[-4px] rounded-full border border-white/0 group-hover:border-white/30 transition-colors duration-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        <div className="w-10 h-10 rounded-full bg-black border border-white/20 flex items-center justify-center text-[10px] uppercase tracking-widest text-white">
          {initials}
        </div>
      </div>
      <div className="flex-1 border-b border-white/10 pb-6 group-hover:border-white/30 transition-colors duration-500">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 leading-loose">
          <span className="text-white">{user}</span> {action}{" "}
          <span className="italic normal-case text-lg text-white font-light mx-1">{target}</span>
        </div>
        <div className="text-[9px] text-white/30 mt-3 uppercase tracking-[0.3em]">{time}</div>
      </div>
    </div>
  );
}

// ─── Create Notebook Modal ─────────────────────────────────────────────────────

function CreateNotebookModal({ onClose, onCreate }: { onClose: () => void; onCreate: (nb: Notebook) => void }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [emoji, setEmoji] = useState("📓");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const EMOJIS = ["📓", "🔬", "📐", "🌍", "🎨", "🎵"];

  async function submit() {
    if (!title.trim()) { setError("Title is required"); return; }
    if (!subject.trim()) { setError("Subject is required"); return; }
    setSaving(true);
    const res = await fetch("/api/notebooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), subject: subject.trim(), emoji }),
    });
    const data = (await res.json()) as { notebook?: Notebook; error?: string };
    setSaving(false);
    if (!res.ok || !data.notebook) { setError(data.error ?? "Failed to create"); return; }
    onCreate(data.notebook);
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-xl italic font-light text-white mb-8 tracking-wide">New Notebook</h2>
      <div className="flex gap-2 mb-6">
        {EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => setEmoji(e)}
            className={`text-xl w-10 h-10 border transition-colors cursor-none ${emoji === e ? "border-white bg-white/10" : "border-white/20 hover:border-white"}`}
          >
            {e}
          </button>
        ))}
      </div>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Title"
        className="w-full bg-transparent border-b border-white/30 px-0 py-3 text-[10px] uppercase tracking-[0.2em] text-white placeholder:text-white/30 focus:outline-none focus:border-white transition-colors mb-4"
      />
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Subject (e.g. Physics, Calculus)"
        className="w-full bg-transparent border-b border-white/30 px-0 py-3 text-[10px] uppercase tracking-[0.2em] text-white placeholder:text-white/30 focus:outline-none focus:border-white transition-colors mb-8"
      />
      {error && <p className="text-[9px] uppercase tracking-[0.2em] text-white/50 mb-4">{error}</p>}
      <div className="flex gap-4">
        <button
          onClick={onClose}
          className="flex-1 py-3 border border-white/20 text-[10px] uppercase tracking-[0.3em] text-white hover:bg-white/10 transition-colors cursor-none"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="flex-1 py-3 bg-white text-black text-[10px] uppercase tracking-[0.3em] hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-none"
        >
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          Create
        </button>
      </div>
    </ModalOverlay>
  );
}

// ─── Create Page Modal ─────────────────────────────────────────────────────────

function CreatePageModal({
  notebooks,
  defaultNotebookId,
  onClose,
  onCreate,
}: {
  notebooks: Notebook[];
  defaultNotebookId: string | undefined;
  onClose: () => void;
  onCreate: (notebookId: string, page: Page) => void;
}) {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [notebookId, setNotebookId] = useState(defaultNotebookId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!title.trim()) { setError("Title is required"); return; }
    if (!notebookId) { setError("Select a notebook"); return; }
    setSaving(true);
    const res = await fetch(`/api/notebooks/${notebookId}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), topic: topic.trim() }),
    });
    const data = (await res.json()) as { page?: Page; error?: string };
    setSaving(false);
    if (!res.ok || !data.page) { setError(data.error ?? "Failed to create"); return; }
    onCreate(notebookId, data.page);
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-xl italic font-light text-white mb-8 tracking-wide">New Page</h2>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Page title"
        className="w-full bg-transparent border-b border-white/30 px-0 py-3 text-[10px] uppercase tracking-[0.2em] text-white placeholder:text-white/30 focus:outline-none focus:border-white transition-colors mb-4"
      />
      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Topic (optional)"
        className="w-full bg-transparent border-b border-white/30 px-0 py-3 text-[10px] uppercase tracking-[0.2em] text-white placeholder:text-white/30 focus:outline-none focus:border-white transition-colors mb-4"
      />
      <select
        value={notebookId}
        onChange={(e) => setNotebookId(e.target.value)}
        className="w-full bg-black border-b border-white/30 px-0 py-3 text-[10px] uppercase tracking-[0.2em] text-white focus:outline-none focus:border-white transition-colors mb-8 cursor-none"
      >
        <option value="">Select notebook…</option>
        {notebooks.map((nb) => (
          <option key={nb.id} value={nb.id}>
            {nb.emoji} {nb.title}
          </option>
        ))}
      </select>
      {error && <p className="text-[9px] uppercase tracking-[0.2em] text-white/50 mb-4">{error}</p>}
      <div className="flex gap-4">
        <button
          onClick={onClose}
          className="flex-1 py-3 border border-white/20 text-[10px] uppercase tracking-[0.3em] text-white hover:bg-white/10 transition-colors cursor-none"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="flex-1 py-3 bg-white text-black text-[10px] uppercase tracking-[0.3em] hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-none"
        >
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          Create & Open
        </button>
      </div>
    </ModalOverlay>
  );
}

// ─── Modal overlay ─────────────────────────────────────────────────────────────

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-black border border-white/20 p-10 w-full max-w-sm shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-white/30 hover:text-white cursor-none"
        >
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
