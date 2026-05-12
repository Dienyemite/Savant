"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search, Bell, Plus, ChevronDown, Book, FileText,
  Star, Users, Trash2, Crown, LayoutGrid, List, MoreVertical, Pin, Check, X, Loader2
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase';
import type { Notebook, Page } from '@/types';
import type { User } from '@supabase/supabase-js';

type SortKey = 'last_edited' | 'title' | 'created';
type ViewMode = 'grid' | 'list';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins || 1}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function userInitials(user: User): string {
  const name: string =
    (user.user_metadata?.display_name as string | undefined) ||
    (user.email ?? '');
  return name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || 'U';
}

export default function FigmaDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [allPages, setAllPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('last_edited');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showNotebookModal, setShowNotebookModal] = useState(false);
  const [showPageModal, setShowPageModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ pageId: string; x: number; y: number } | null>(null);
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
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
      const nbRes = await fetch('/api/notebooks');
      if (!nbRes.ok) return;
      const { notebooks: nbs } = await nbRes.json() as { notebooks: Notebook[] };
      setNotebooks(nbs);
      const pageArrays = await Promise.all(
        nbs.map(nb =>
          fetch(`/api/notebooks/${nb.id}/pages`)
            .then(r => r.ok ? r.json() as Promise<{ pages: Page[] }> : { pages: [] as Page[] })
            .then(d => d.pages)
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
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSearchQuery('');
        searchRef.current?.blur();
        setContextMenu(null);
        setShowSortMenu(false);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) setShowSortMenu(false);
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) setContextMenu(null);
      if (showUserMenu) setShowUserMenu(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUserMenu]);

  const displayedPages = useMemo(() => {
    let pages = activeNotebookId ? allPages.filter(p => p.notebook_id === activeNotebookId) : allPages;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      pages = pages.filter(p => p.title.toLowerCase().includes(q) || p.topic?.toLowerCase().includes(q));
    }
    return [...pages].sort((a, b) => {
      if (sortKey === 'title') return a.title.localeCompare(b.title);
      if (sortKey === 'created') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [allPages, activeNotebookId, searchQuery, sortKey]);

  const recentPages = useMemo(() =>
    [...allPages].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5),
    [allPages]
  );

  const favoritePages = useMemo(() => allPages.filter(p => p.is_favorited).slice(0, 4), [allPages]);

  function notebookFor(page: Page) { return notebooks.find(n => n.id === page.notebook_id); }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function togglePin(page: Page) {
    const next = !page.is_pinned;
    setAllPages(ps => ps.map(p => p.id === page.id ? { ...p, is_pinned: next } : p));
    await fetch(`/api/pages/${page.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_pinned: next }) });
  }

  async function toggleStar(page: Page) {
    const next = !page.is_favorited;
    setAllPages(ps => ps.map(p => p.id === page.id ? { ...p, is_favorited: next } : p));
    await fetch(`/api/pages/${page.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_favorited: next }) });
  }

  async function renamePage(pageId: string, title: string) {
    if (!title.trim()) { setRenamingPageId(null); return; }
    setAllPages(ps => ps.map(p => p.id === pageId ? { ...p, title } : p));
    setRenamingPageId(null);
    await fetch(`/api/pages/${pageId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
  }

  async function deletePage(pageId: string) {
    setAllPages(ps => ps.filter(p => p.id !== pageId));
    setContextMenu(null);
    await fetch(`/api/pages/${pageId}`, { method: 'DELETE' });
  }

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    router.push('/onboarding');
  }

  const sortLabels: Record<SortKey, string> = { last_edited: 'Last edited', title: 'Title', created: 'Created' };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white text-black text-sm font-medium px-4 py-2 rounded-lg shadow-lg">{toast}</div>
      )}

      {contextMenu && (
        <div ref={contextMenuRef} className="fixed z-50 bg-black border border-white rounded-lg shadow-xl py-1 min-w-[140px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}>
          <button className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10" onClick={() => {
            const page = allPages.find(p => p.id === contextMenu.pageId);
            if (page) { setRenamingPageId(page.id); setRenameValue(page.title); }
            setContextMenu(null);
          }}>Rename</button>
          <button className="w-full text-left px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => deletePage(contextMenu.pageId)}>Delete</button>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="w-64 border-r border-white bg-black flex flex-col shrink-0">
        <div className="p-4 border-b border-white">
          <Link href="/" className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-white border border-white rounded flex items-center justify-center text-black text-[10px] font-bold">IB</div>
            <span className="font-medium text-white">Savant</span>
          </Link>
          <button className="w-full flex items-center justify-between text-left hover:bg-white/10 p-2 -mx-2 rounded-lg transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 border border-white rounded flex items-center justify-center text-xs">
                {user ? userInitials(user)[0] : 'S'}
              </div>
              <div>
                <div className="text-sm font-medium text-white">Student Workspace</div>
                <div className="text-xs text-white/70">Personal</div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-white/70" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          <div>
            <div className="text-xs font-semibold text-white/70 mb-2 px-3 tracking-wider">WORKSPACE</div>
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
              <div className="text-xs font-semibold text-white/70 tracking-wider">CLASSES</div>
              <button onClick={() => setShowNotebookModal(true)}><Plus className="w-3.5 h-3.5 text-white/70 hover:text-white" /></button>
            </div>
            <nav className="space-y-0.5">
              {loading ? (
                <div className="px-3 py-2 text-xs text-white/50">Loading…</div>
              ) : notebooks.map(nb => (
                <ClassItem key={nb.id} label={nb.title}
                  pages={allPages.filter(p => p.notebook_id === nb.id).length}
                  active={activeNotebookId === nb.id}
                  onClick={() => setActiveNotebookId(nb.id === activeNotebookId ? null : nb.id)} />
              ))}
              <button onClick={() => setShowNotebookModal(true)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors mt-1">
                <Plus className="w-4 h-4" /><span>Add class</span>
              </button>
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-white">
          <div className="bg-black border border-white rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">Upgrade to Pro</span>
            </div>
            <p className="text-xs text-white/70 mb-3">Unlock unlimited notebooks, offline mode, and more.</p>
            <button className="w-full bg-white text-black text-sm font-medium py-1.5 rounded-md hover:bg-white/90 transition-colors">Go Pro</button>
          </div>

          <div className="relative">
            <button onClick={() => setShowUserMenu(v => !v)}
              className="w-full flex items-center justify-between hover:bg-white/10 p-2 -mx-2 rounded-lg transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 border border-white rounded-full flex items-center justify-center text-xs font-bold text-white bg-black">
                  {user ? userInitials(user) : 'U'}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-white truncate max-w-[120px]">
                    {(user?.user_metadata?.display_name as string | undefined) ?? user?.email?.split('@')[0] ?? 'User'}
                  </div>
                  <div className="text-xs text-white/70 truncate max-w-[120px]">{user?.email ?? ''}</div>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-white/70 shrink-0" />
            </button>
            {showUserMenu && (
              <div className="absolute bottom-12 left-0 right-0 bg-black border border-white rounded-lg shadow-xl py-1 z-50">
                <button onClick={signOut} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10">Sign out</button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-white flex items-center justify-between px-6 bg-black">
          <div className="relative w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
            <input ref={searchRef} type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search notebooks, pages, or tags..."
              className="w-full bg-black border border-white rounded-md pl-9 pr-12 py-1.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white transition-colors" />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/70 border border-white/50 rounded px-1.5 py-0.5">⌘K</div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowPageModal(true)}
              className="bg-white text-black px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 hover:bg-white/90 transition-colors">
              <Plus className="w-4 h-4" />New<ChevronDown className="w-3 h-3 ml-1" />
            </button>
            <button className="relative text-white/70 hover:text-white transition-colors"><Bell className="w-5 h-5" /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">Notebooks</h1>
                  <p className="text-white/70 text-sm">Organize your ideas. Create without limits.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowNotebookModal(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-white rounded-md text-sm font-medium hover:bg-white/10 transition-colors">
                    <Plus className="w-4 h-4 text-white" />New Notebook
                  </button>
                  <button onClick={() => setShowPageModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-md text-sm font-medium hover:bg-white/90 transition-colors">
                    <Plus className="w-4 h-4" />New Page
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 border-b border-white pb-px overflow-x-auto">
                <Tab active={activeNotebookId === null} onClick={() => setActiveNotebookId(null)}>All</Tab>
                {notebooks.map(nb => (
                  <Tab key={nb.id} active={activeNotebookId === nb.id} onClick={() => setActiveNotebookId(nb.id)}>{nb.title}</Tab>
                ))}
                <button onClick={() => setShowNotebookModal(true)} className="p-2 text-white/70 hover:text-white shrink-0"><Plus className="w-4 h-4" /></button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-white">Pages overview</h2>
                  <span className="text-xs text-white/50">{displayedPages.length} pages</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-white/70">
                  <div className="relative" ref={sortMenuRef}>
                    <button onClick={() => setShowSortMenu(v => !v)} className="flex items-center gap-1 hover:text-white">
                      Sort by: {sortLabels[sortKey]}<ChevronDown className="w-3 h-3" />
                    </button>
                    {showSortMenu && (
                      <div className="absolute right-0 top-7 bg-black border border-white rounded-lg shadow-xl py-1 min-w-[160px] z-30">
                        {(Object.entries(sortLabels) as [SortKey, string][]).map(([k, label]) => (
                          <button key={k} onClick={() => { setSortKey(k); setShowSortMenu(false); }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/10">
                            {sortKey === k ? <Check className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 inline-block" />}
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 border border-white rounded-md p-0.5">
                    <button onClick={() => setViewMode('grid')} className={`p-1 rounded transition-colors ${viewMode === 'grid' ? 'bg-white text-black' : 'hover:text-white'}`}><LayoutGrid className="w-4 h-4" /></button>
                    <button onClick={() => setViewMode('list')} className={`p-1 rounded transition-colors ${viewMode === 'list' ? 'bg-white text-black' : 'hover:text-white'}`}><List className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4' : 'flex flex-col gap-2'}>
                  {Array.from({ length: 8 }).map((_, i) => <div key={i} className="bg-black border border-white/30 rounded-xl h-48 animate-pulse" />)}
                </div>
              ) : displayedPages.length === 0 ? (
                <div className="text-center py-16 text-white/50">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No pages yet.</p>
                  <button onClick={() => setShowPageModal(true)} className="mt-3 text-sm text-white underline hover:no-underline">Create your first page</button>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4' : 'flex flex-col gap-2'}>
                  {displayedPages.map(page => (
                    <PageCard key={page.id} page={page} notebook={notebookFor(page)} viewMode={viewMode}
                      onPin={() => togglePin(page)} onStar={() => toggleStar(page)}
                      onContextMenu={(x, y) => setContextMenu({ pageId: page.id, x, y })}
                      isRenaming={renamingPageId === page.id} renameValue={renameValue}
                      onRenameChange={setRenameValue} onRenameCommit={() => renamePage(page.id, renameValue)} onRenameCancel={() => setRenamingPageId(null)}
                      onClick={() => router.push(`/figma-canvas/${page.notebook_id}/${page.id}`)} />
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Widget title="Recent notes">
                {recentPages.length === 0 ? <p className="text-xs text-white/50 py-2">No pages yet.</p> : (
                  <div className="space-y-1">
                    {recentPages.map(page => (
                      <NoteListItem key={page.id} title={page.title}
                        meta={`${notebookFor(page)?.title ?? 'Notebook'} • Edited ${relativeTime(page.updated_at)}`}
                        isPinned={page.is_pinned} onPin={() => togglePin(page)}
                        onClick={() => router.push(`/figma-canvas/${page.notebook_id}/${page.id}`)} />
                    ))}
                  </div>
                )}
              </Widget>

              <Widget title="Favorite pages">
                {favoritePages.length === 0 ? <p className="text-xs text-white/50 py-2">No favorites yet. Star a page to see it here.</p> : (
                  <div className="space-y-3">
                    {favoritePages.map(page => (
                      <FavoriteCard key={page.id} title={page.title}
                        meta={`${notebookFor(page)?.title ?? 'Notebook'} • Edited ${relativeTime(page.updated_at)}`}
                        onClick={() => router.push(`/figma-canvas/${page.notebook_id}/${page.id}`)} />
                    ))}
                  </div>
                )}
              </Widget>

              <Widget title="Activity">
                {recentPages.length === 0 ? <p className="text-xs text-white/50 py-2">No activity yet.</p> : (
                  <div className="space-y-4">
                    {recentPages.map(page => (
                      <ActivityItem key={page.id} action="edited" target={page.title}
                        time={relativeTime(page.updated_at)} initials={user ? userInitials(user) : 'U'} />
                    ))}
                  </div>
                )}
              </Widget>
            </div>
          </div>
        </div>
      </main>

      {showNotebookModal && (
        <CreateNotebookModal onClose={() => setShowNotebookModal(false)} onCreate={nb => {
          setNotebooks(prev => [nb, ...prev]);
          setActiveNotebookId(nb.id);
          setShowNotebookModal(false);
          showToast('Notebook created');
        }} />
      )}

      {showPageModal && (
        <CreatePageModal notebooks={notebooks} defaultNotebookId={activeNotebookId ?? notebooks[0]?.id}
          onClose={() => setShowPageModal(false)}
          onCreate={(notebookId, page) => {
            setAllPages(prev => [...prev, page]);
            setShowPageModal(false);
            router.push(`/figma-canvas/${notebookId}/${page.id}`);
          }} />
      )}
    </div>
  );
}

// ─── Create Notebook Modal ────────────────────────────────────────────────────
function CreateNotebookModal({ onClose, onCreate }: { onClose: () => void; onCreate: (nb: Notebook) => void }) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [emoji, setEmoji] = useState('📓');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const EMOJIS = ['📓', '🔬', '📐', '🌍', '🎨', '🎵'];

  async function submit() {
    if (!title.trim()) { setError('Title is required'); return; }
    if (!subject.trim()) { setError('Subject is required'); return; }
    setSaving(true);
    const res = await fetch('/api/notebooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim(), subject: subject.trim(), emoji }) });
    const data = await res.json() as { notebook?: Notebook; error?: string };
    setSaving(false);
    if (!res.ok || !data.notebook) { setError(data.error ?? 'Failed to create'); return; }
    onCreate(data.notebook);
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-semibold text-white mb-5">New Notebook</h2>
      <div className="flex gap-2 mb-4">
        {EMOJIS.map(e => (
          <button key={e} onClick={() => setEmoji(e)}
            className={`text-xl w-9 h-9 rounded-lg border transition-colors ${emoji === e ? 'border-white bg-white/10' : 'border-white/30 hover:border-white'}`}>{e}</button>
        ))}
      </div>
      <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Title" className="w-full bg-black border border-white rounded-md px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white mb-3" />
      <input value={subject} onChange={e => setSubject(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Subject (e.g. Physics, Calculus)" className="w-full bg-black border border-white rounded-md px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white mb-4" />
      {error && <p className="text-xs text-white/70 mb-3">{error}</p>}
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2 border border-white rounded-md text-sm text-white hover:bg-white/10 transition-colors">Cancel</button>
        <button onClick={submit} disabled={saving}
          className="flex-1 py-2 bg-white text-black rounded-md text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Create
        </button>
      </div>
    </ModalOverlay>
  );
}

// ─── Create Page Modal ────────────────────────────────────────────────────────
function CreatePageModal({ notebooks, defaultNotebookId, onClose, onCreate }: {
  notebooks: Notebook[]; defaultNotebookId: string | undefined;
  onClose: () => void; onCreate: (notebookId: string, page: Page) => void;
}) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [notebookId, setNotebookId] = useState(defaultNotebookId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!title.trim()) { setError('Title is required'); return; }
    if (!notebookId) { setError('Select a notebook'); return; }
    setSaving(true);
    const res = await fetch(`/api/notebooks/${notebookId}/pages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim(), topic: topic.trim() }) });
    const data = await res.json() as { page?: Page; error?: string };
    setSaving(false);
    if (!res.ok || !data.page) { setError(data.error ?? 'Failed to create'); return; }
    onCreate(notebookId, data.page);
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-semibold text-white mb-5">New Page</h2>
      <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Page title" className="w-full bg-black border border-white rounded-md px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white mb-3" />
      <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Topic (optional)" className="w-full bg-black border border-white rounded-md px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white mb-3" />
      <select value={notebookId} onChange={e => setNotebookId(e.target.value)}
        className="w-full bg-black border border-white rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white mb-4">
        <option value="">Select notebook…</option>
        {notebooks.map(nb => <option key={nb.id} value={nb.id}>{nb.emoji} {nb.title}</option>)}
      </select>
      {error && <p className="text-xs text-white/70 mb-3">{error}</p>}
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2 border border-white rounded-md text-sm text-white hover:bg-white/10 transition-colors">Cancel</button>
        <button onClick={submit} disabled={saving}
          className="flex-1 py-2 bg-white text-black rounded-md text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Create & Open
        </button>
      </div>
    </ModalOverlay>
  );
}

// ─── Modal overlay wrapper ────────────────────────────────────────────────────
function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-black border border-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
        {children}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-white text-black font-medium' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
      {icon}<span>{label}</span>
    </button>
  );
}

function ClassItem({ label, pages, active, onClick }: { label: string; pages: number; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors group ${active ? 'bg-white/10' : 'hover:bg-white/10'}`}>
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold border border-white text-white shrink-0">{label[0].toUpperCase()}</div>
        <div className="text-left">
          <div className="text-sm text-white truncate max-w-[120px]">{label}</div>
          <div className="text-xs text-white/50">{pages} pages</div>
        </div>
      </div>
    </button>
  );
}

function Tab({ children, active = false, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors shrink-0 ${active ? 'border-white text-white' : 'border-transparent text-white/70 hover:text-white'}`}>
      {children}
    </button>
  );
}

function PageCard({ page, notebook, viewMode, onPin, onStar, onContextMenu, isRenaming, renameValue, onRenameChange, onRenameCommit, onRenameCancel, onClick }: {
  page: Page; notebook: Notebook | undefined; viewMode: ViewMode;
  onPin: () => void; onStar: () => void; onContextMenu: (x: number, y: number) => void;
  isRenaming: boolean; renameValue: string; onRenameChange: (v: string) => void;
  onRenameCommit: () => void; onRenameCancel: () => void; onClick: () => void;
}) {
  if (viewMode === 'list') {
    return (
      <div onClick={onClick} className="bg-black border border-white hover:bg-white/5 rounded-lg overflow-hidden flex items-center gap-4 px-4 py-3 group cursor-pointer transition-colors">
        <div className="w-10 h-10 rounded bg-black border border-white shrink-0"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)', backgroundSize: '8px 8px' }} />
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <input autoFocus value={renameValue} onChange={e => onRenameChange(e.target.value)}
              onKeyDown={e => { e.key === 'Enter' && onRenameCommit(); e.key === 'Escape' && onRenameCancel(); }}
              onBlur={onRenameCommit} onClick={e => e.stopPropagation()}
              className="text-sm font-medium text-white bg-transparent border-b border-white focus:outline-none w-full" />
          ) : (
            <h3 className="text-sm font-medium text-white truncate">{page.title}</h3>
          )}
          <p className="text-xs text-white/50">{notebook?.title ?? ''} • {relativeTime(page.updated_at)}</p>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); onPin(); }} className="text-white/70 hover:text-white"><Pin className={`w-4 h-4 ${page.is_pinned ? 'fill-current text-white' : ''}`} /></button>
          <button onClick={e => { e.stopPropagation(); onStar(); }} className="text-white/70 hover:text-white"><Star className={`w-4 h-4 ${page.is_favorited ? 'fill-current text-white' : ''}`} /></button>
          <button onClick={e => { e.stopPropagation(); onContextMenu(e.clientX, e.clientY); }} className="text-white/70 hover:text-white"><MoreVertical className="w-4 h-4" /></button>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClick} className="bg-black border border-white hover:bg-white/5 rounded-xl overflow-hidden flex flex-col group cursor-pointer transition-colors">
      <div className="h-32 bg-black relative border-b border-white"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)', backgroundSize: '16px 16px' }}>
        <button onClick={e => { e.stopPropagation(); onPin(); }} className="absolute top-2 left-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <Pin className={`w-4 h-4 ${page.is_pinned ? 'fill-current' : ''}`} />
        </button>
        <button onClick={e => { e.stopPropagation(); onStar(); }} className="absolute top-2 right-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <Star className={`w-4 h-4 ${page.is_favorited ? 'fill-current' : ''}`} />
        </button>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          {isRenaming ? (
            <input autoFocus value={renameValue} onChange={e => onRenameChange(e.target.value)}
              onKeyDown={e => { e.key === 'Enter' && onRenameCommit(); e.key === 'Escape' && onRenameCancel(); }}
              onBlur={onRenameCommit} onClick={e => e.stopPropagation()}
              className="text-sm font-medium text-white bg-transparent border-b border-white focus:outline-none flex-1 pr-2" />
          ) : (
            <h3 className="text-sm font-medium text-white truncate pr-2">{page.title}</h3>
          )}
          <button onClick={e => { e.stopPropagation(); onContextMenu(e.clientX, e.clientY); }}
            className="text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
        {page.topic && <div className="flex items-center gap-2 mb-2"><span className="text-[10px] px-1.5 py-0.5 rounded border border-white text-white/70 bg-black truncate max-w-[120px]">{page.topic}</span></div>}
        <div className="flex items-center justify-between text-xs text-white/50">
          <div className="flex gap-2 min-w-0">
            <span className="truncate">{notebook?.title ?? ''}</span>
            <span className="shrink-0">Edited {relativeTime(page.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-black border border-white rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <button className="text-xs text-white underline hover:no-underline">View all</button>
      </div>
      {children}
    </div>
  );
}

function NoteListItem({ title, meta, isPinned, onPin, onClick }: { title: string; meta: string; isPinned: boolean; onPin: () => void; onClick: () => void }) {
  return (
    <div onClick={onClick} className="flex items-center justify-between p-2 hover:bg-white/10 rounded-lg group cursor-pointer border border-transparent hover:border-white">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded bg-black border border-white flex items-center justify-center text-white/70 shrink-0"><FileText className="w-4 h-4" /></div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-white truncate">{title}</div>
          <div className="text-xs text-white/50 truncate">{meta}</div>
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); onPin(); }} className={isPinned ? 'text-white' : 'text-white/50 opacity-0 group-hover:opacity-100 hover:text-white transition-all'}>
        <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
      </button>
    </div>
  );
}

function FavoriteCard({ title, meta, onClick }: { title: string; meta: string; onClick: () => void }) {
  return (
    <div onClick={onClick} className="flex items-center justify-between p-2 hover:bg-white/10 border border-white rounded-lg group cursor-pointer bg-black">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded bg-black border border-white relative overflow-hidden shrink-0"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '8px 8px' }}>
          <div className="absolute inset-1 border border-dashed border-white rounded-sm opacity-50" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-white truncate">{title}</div>
          <div className="text-xs text-white/50 truncate">{meta}</div>
        </div>
      </div>
      <Star className="w-4 h-4 text-white fill-current shrink-0" />
    </div>
  );
}

function ActivityItem({ action, target, time, initials }: { action: string; target: string; time: string; initials: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full border border-white bg-black flex items-center justify-center text-xs font-bold text-white shrink-0">{initials}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white/70 leading-snug">
          <span className="font-medium text-white">You</span> {action} <span className="text-white italic truncate">{target}</span>
        </div>
        <div className="text-xs text-white/50 mt-0.5">{time}</div>
      </div>
      <div className="w-1.5 h-1.5 rounded-full mt-2 bg-white shrink-0" />
    </div>
  );
}
