import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const content = `"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, Bell, Plus, ChevronDown, Book, FileText,
  Star, Users, Trash2, Crown, LayoutGrid, List, MoreVertical, Pin, X, Loader2,
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase';
import type { Notebook, Page } from '@/types';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const SUBJECT_EMOJIS: Record<string, string> = {
  physics: '\u26db\ufe0f', calculus: '\u222b', math: '\u2211', biology: '\ud83e\uddec',
  chemistry: '\ud83e\uddea', history: '\ud83d\udcdc', literature: '\ud83d\udcd6', computer: '\ud83d\udcbb',
  music: '\ud83c\udfb5', art: '\ud83c\udfa8', economics: '\ud83d\udcc8', psychology: '\ud83e\udde0',
};

function subjectEmoji(subject: string): string {
  const key = Object.keys(SUBJECT_EMOJIS).find(k => subject.toLowerCase().includes(k));
  return key ? SUBJECT_EMOJIS[key] : '\ud83d\udcd3';
}

function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return \`\${mins}m ago\`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return \`\${hours}h ago\`;
  const days = Math.floor(hours / 24);
  return \`\${days}d ago\`;
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function FigmaDashboard() {
  const router = useRouter();

  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [allPages, setAllPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNotebookId, setActiveNotebookId] = useState<string>('all');

  const [userEmail, setUserEmail] = useState('');
  const [userInitials, setUserInitials] = useState('?');

  const [showNewNotebook, setShowNewNotebook] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [creating, setCreating] = useState(false);

  const [showNewPage, setShowNewPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [creatingPage, setCreatingPage] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/notebooks');
    if (!res.ok) { setLoading(false); return; }
    const json = (await res.json()) as { notebooks: Notebook[] };
    const nbs = json.notebooks ?? [];
    setNotebooks(nbs);
    if (nbs.length > 0) {
      const pageResults = await Promise.all(
        nbs.map(async (nb) => {
          const r = await fetch(\`/api/notebooks/\${nb.id}/pages\`);
          if (!r.ok) return [] as Page[];
          const pj = (await r.json()) as { pages: Page[] };
          return pj.pages ?? [];
        })
      );
      setAllPages(pageResults.flat());
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data }) => {
      if (data.user) {
        const email = data.user.email ?? '';
        const name = (data.user.user_metadata?.full_name as string | undefined) ?? email;
        setUserEmail(email);
        setUserInitials(name.slice(0, 2).toUpperCase() || '??');
      }
    });
  }, []);

  const handleCreateNotebook = async () => {
    if (!newTitle.trim() || !newSubject.trim()) return;
    setCreating(true);
    const emoji = subjectEmoji(newSubject);
    const res = await fetch('/api/notebooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), subject: newSubject.trim(), emoji }),
    });
    if (res.ok) {
      const json = (await res.json()) as { notebook: Notebook };
      setNotebooks(prev => [...prev, json.notebook]);
      setActiveNotebookId(json.notebook.id);
      await loadData();
    }
    setCreating(false);
    setShowNewNotebook(false);
    setNewTitle('');
    setNewSubject('');
  };

  const targetNotebook =
    activeNotebookId === 'all' ? notebooks[0] : notebooks.find(n => n.id === activeNotebookId);

  const handleCreatePage = async () => {
    if (!newPageTitle.trim() || !targetNotebook) return;
    setCreatingPage(true);
    const res = await fetch(\`/api/notebooks/\${targetNotebook.id}/pages\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newPageTitle.trim() }),
    });
    if (res.ok) {
      const json = (await res.json()) as { page: Page };
      router.push(\`/figma-canvas/\${targetNotebook.id}/\${json.page.id}\`);
    }
    setCreatingPage(false);
  };

  const displayedPages = (() => {
    const base = activeNotebookId === 'all'
      ? allPages
      : allPages.filter(p => p.notebook_id === activeNotebookId);
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter(p =>
      p.title.toLowerCase().includes(q) || (p.topic ?? '').toLowerCase().includes(q)
    );
  })();

  const recentPages = [...allPages]
    .sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime())
    .slice(0, 5);

  const notebookForPage = (page: Page) => notebooks.find(n => n.id === page.notebook_id);

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
                <input type="text" placeholder="Notebook title (e.g. Physics 201)" value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none" autoFocus />
              </div>
              <div className="border-b border-white/10 pb-2">
                <input type="text" placeholder="Subject (e.g. physics, calculus)" value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none"
                  onKeyDown={e => e.key === 'Enter' && handleCreateNotebook()} />
              </div>
            </div>
            <button onClick={handleCreateNotebook}
              disabled={creating || !newTitle.trim() || !newSubject.trim()}
              className="w-full bg-white text-black text-sm font-medium py-2 rounded-md hover:bg-white/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
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
                New Page{targetNotebook ? \` in \${targetNotebook.title}\` : ''}
              </h2>
              <button onClick={() => setShowNewPage(false)} className="text-white/50 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="border-b border-white/10 pb-2">
              <input type="text" placeholder="Page title (e.g. Projectile Motion)" value={newPageTitle}
                onChange={e => setNewPageTitle(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none" autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreatePage()} />
            </div>
            {notebooks.length === 0 && (
              <p className="text-xs text-white/40">Create a notebook first to add pages.</p>
            )}
            <button onClick={handleCreatePage}
              disabled={creatingPage || !newPageTitle.trim() || !targetNotebook}
              className="w-full bg-white text-black text-sm font-medium py-2 rounded-md hover:bg-white/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              {creatingPage ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Create Page
            </button>
          </div>
        </div>
      )}

      <aside className="w-64 border-r border-white bg-black flex flex-col shrink-0">
        <div className="p-4 border-b border-white">
          <Link href="/" className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-white border border-white rounded flex items-center justify-center text-black text-[10px] font-bold">IB</div>
            <span className="font-medium text-white">Savant</span>
          </Link>
          <button className="w-full flex items-center justify-between text-left hover:bg-white/10 p-2 -mx-2 rounded-lg transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 border border-white rounded flex items-center justify-center text-xs font-bold">{userInitials}</div>
              <div>
                <div className="text-sm font-medium text-white truncate max-w-[130px]">
                  {userEmail ? userEmail.split('@')[0] : 'Student'}
                </div>
                <div className="text-xs text-white/70">Student Workspace</div>
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
              <SidebarItem icon={<FileText className="w-4 h-4" />} label="All Pages" onClick={() => setActiveNotebookId('all')} />
              <SidebarItem icon={<Star className="w-4 h-4" />} label="Favorites" />
              <SidebarItem icon={<Users className="w-4 h-4" />} label="Shared with me" />
              <SidebarItem icon={<Trash2 className="w-4 h-4" />} label="Trash" />
            </nav>
          </div>

          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <div className="text-xs font-semibold text-white/70 tracking-wider">NOTEBOOKS</div>
              <Plus className="w-3.5 h-3.5 text-white/70 cursor-pointer hover:text-white" onClick={() => setShowNewNotebook(true)} />
            </div>
            <nav className="space-y-0.5">
              {loading ? (
                <div className="px-3 py-2"><Loader2 className="w-4 h-4 animate-spin text-white/30" /></div>
              ) : notebooks.length === 0 ? (
                <p className="text-xs text-white/30 px-3 py-2">No notebooks yet.</p>
              ) : (
                notebooks.map(nb => (
                  <NotebookItem key={nb.id} notebook={nb}
                    pages={allPages.filter(p => p.notebook_id === nb.id).length}
                    active={activeNotebookId === nb.id}
                    onClick={() => setActiveNotebookId(nb.id)} />
                ))
              )}
              <button onClick={() => setShowNewNotebook(true)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors mt-1">
                <Plus className="w-4 h-4" /><span>Add notebook</span>
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
          <button className="w-full flex items-center justify-between hover:bg-white/10 p-2 -mx-2 rounded-lg transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 border border-white rounded-full flex items-center justify-center text-xs font-bold">{userInitials}</div>
              <div className="text-left overflow-hidden">
                <div className="text-sm font-medium text-white truncate max-w-[120px]">{userEmail ? userEmail.split('@')[0] : 'Student'}</div>
                <div className="text-xs text-white/70 truncate max-w-[120px]">{userEmail}</div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-white/70" />
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-white flex items-center justify-between px-6 bg-black shrink-0">
          <div className="relative w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
            <input type="text" placeholder="Search notebooks, pages, or tags..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-white rounded-md pl-9 pr-12 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white transition-colors" />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/70 border border-white/50 rounded px-1.5 py-0.5">\u2318K</div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowNewNotebook(true)}
              className="flex items-center gap-2 px-4 py-1.5 border border-white rounded-md text-sm font-medium hover:bg-white/10 transition-colors">
              <Plus className="w-4 h-4" />Notebook
            </button>
            <button onClick={() => setShowNewPage(true)}
              className="bg-white text-black px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 hover:bg-white/90 transition-colors">
              <Plus className="w-4 h-4" />New Page
            </button>
            <button className="relative text-white/70 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
            </button>
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
                  <button onClick={() => setShowNewNotebook(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-white rounded-md text-sm font-medium hover:bg-white/10 transition-colors">
                    <Plus className="w-4 h-4 text-white" />New Notebook
                  </button>
                  <button onClick={() => setShowNewPage(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-md text-sm font-medium hover:bg-white/90 transition-colors">
                    <Plus className="w-4 h-4" />New Page
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 border-b border-white pb-px overflow-x-auto">
                <Tab active={activeNotebookId === 'all'} onClick={() => setActiveNotebookId('all')}>All</Tab>
                {notebooks.map(nb => (
                  <Tab key={nb.id} active={activeNotebookId === nb.id} onClick={() => setActiveNotebookId(nb.id)}>
                    {nb.emoji} {nb.title}
                  </Tab>
                ))}
                <button onClick={() => setShowNewNotebook(true)} className="p-2 text-white/70 hover:text-white shrink-0">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-white">Pages overview</h2>
                  <span className="text-xs text-white/50">{displayedPages.length} pages</span>
                </div>
                <div className="flex items-center gap-1 border border-white rounded-md p-0.5">
                  <button className="p-1 bg-white text-black rounded"><LayoutGrid className="w-4 h-4" /></button>
                  <button className="p-1 hover:text-white rounded"><List className="w-4 h-4" /></button>
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>
              ) : displayedPages.length === 0 ? (
                <EmptyPagesState onNew={() => setShowNewPage(true)} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {displayedPages.map(page => {
                    const nb = notebookForPage(page);
                    return <PageCard key={page.id} page={page} notebookTitle={nb?.title ?? ''} notebookId={nb?.id ?? ''} />;
                  })}
                  <button onClick={() => setShowNewPage(true)}
                    className="bg-black border border-dashed border-white/30 rounded-xl overflow-hidden flex flex-col items-center justify-center h-[200px] gap-3 text-white/30 hover:text-white/60 hover:border-white/60 transition-colors">
                    <Plus className="w-8 h-8" /><span className="text-sm">New page</span>
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Widget title="Recent notes">
                {recentPages.length === 0 ? (
                  <p className="text-xs text-white/30 py-4 text-center">No pages yet.</p>
                ) : (
                  <div className="space-y-1">
                    {recentPages.map(page => {
                      const nb = notebookForPage(page);
                      return <NoteListItem key={page.id} title={page.title}
                        meta={\`\${nb?.title ?? ''} \u2022 Edited \${relativeTime(page.updated_at)}\`}
                        href={nb ? \`/figma-canvas/\${nb.id}/\${page.id}\` : '#'} />;
                    })}
                  </div>
                )}
              </Widget>

              <Widget title="Pages with lessons">
                {allPages.filter(p => (p.lesson_content as unknown[] | null)?.length).length === 0 ? (
                  <p className="text-xs text-white/30 py-4 text-center">Generate a lesson to see it here.</p>
                ) : (
                  <div className="space-y-3">
                    {allPages.filter(p => (p.lesson_content as unknown[] | null)?.length).slice(0, 4).map(page => {
                      const nb = notebookForPage(page);
                      return <FavoriteCard key={page.id} title={page.title}
                        meta={\`\${nb?.title ?? ''} \u2022 Edited \${relativeTime(page.updated_at)}\`}
                        href={nb ? \`/figma-canvas/\${nb.id}/\${page.id}\` : '#'} />;
                    })}
                  </div>
                )}
              </Widget>

              <Widget title="Activity">
                {recentPages.length === 0 ? (
                  <p className="text-xs text-white/30 py-4 text-center">No activity yet.</p>
                ) : (
                  <div className="space-y-4">
                    {recentPages.map(page => {
                      const nb = notebookForPage(page);
                      return <ActivityItem key={page.id} target={page.title} action="edited"
                        notebookTitle={nb?.title ?? ''} time={relativeTime(page.updated_at)} initials={userInitials} />;
                    })}
                  </div>
                )}
              </Widget>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors \${active ? 'bg-white text-black font-medium' : 'text-white/70 hover:text-white hover:bg-white/10'}\`}>
      {icon}<span>{label}</span>
    </button>
  );
}

function NotebookItem({ notebook, pages, active, onClick }: { notebook: Notebook; pages: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={\`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-colors \${active ? 'bg-white/10' : ''}\`}>
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold border border-white text-white">
          {notebook.emoji ?? notebook.title[0]}
        </div>
        <div className="text-left">
          <div className={\`text-sm \${active ? 'text-white font-medium' : 'text-white'}\`}>{notebook.title}</div>
          <div className="text-xs text-white/50">{pages} pages</div>
        </div>
      </div>
    </button>
  );
}

function Tab({ children, active = false, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className={\`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 \${active ? 'border-white text-white' : 'border-transparent text-white/70 hover:text-white'}\`}>
      {children}
    </button>
  );
}

function PageCard({ page, notebookTitle, notebookId }: { page: Page; notebookTitle: string; notebookId: string }) {
  const hasLesson = (page.lesson_content as unknown[] | null | undefined)?.length ?? 0;
  return (
    <Link href={\`/figma-canvas/\${notebookId}/\${page.id}\`}
      className="bg-black border border-white hover:bg-white/5 rounded-xl overflow-hidden flex flex-col group cursor-pointer transition-colors">
      <div className="h-32 bg-black relative border-b border-white"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)', backgroundSize: '16px 16px' }}>
        {hasLesson > 0 && (
          <div className="absolute bottom-2 left-2 text-[10px] px-1.5 py-0.5 border border-white/50 rounded text-white/70">\u2713 Lesson</div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-sm font-medium text-white truncate pr-2">{page.title}</h3>
          <MoreVertical className="w-4 h-4 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
        {page.topic && (
          <div className="mb-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-white text-white/70 bg-black truncate">{page.topic}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-white/50">
          <span className="truncate">{notebookTitle}</span>
          <span className="shrink-0 ml-2">{relativeTime(page.updated_at)}</span>
        </div>
      </div>
    </Link>
  );
}

function EmptyPagesState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-32 h-24 border border-dashed border-white/20 rounded-xl flex items-center justify-center"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)', backgroundSize: '16px 16px' }}>
        <FileText className="w-8 h-8 text-white/20" />
      </div>
      <p className="text-white/40 text-sm">No pages yet.</p>
      <button onClick={onNew}
        className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-white/90 transition-colors">
        <Plus className="w-4 h-4" />Create your first page
      </button>
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

function NoteListItem({ title, meta, href }: { title: string; meta: string; href: string }) {
  return (
    <Link href={href}
      className="flex items-center justify-between p-2 hover:bg-white/10 rounded-lg group cursor-pointer border border-transparent hover:border-white">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded bg-black border border-white flex items-center justify-center text-white/70 shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-white truncate">{title}</div>
          <div className="text-xs text-white/50 truncate">{meta}</div>
        </div>
      </div>
      <Pin className="w-4 h-4 text-white/50 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2" />
    </Link>
  );
}

function FavoriteCard({ title, meta, href }: { title: string; meta: string; href: string }) {
  return (
    <Link href={href}
      className="flex items-center justify-between p-2 hover:bg-white/10 border border-white rounded-lg group cursor-pointer bg-black">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded bg-black border border-white relative overflow-hidden shrink-0"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '8px 8px' }}>
          <div className="absolute inset-1 border border-dashed border-white rounded-sm opacity-50"></div>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-white truncate">{title}</div>
          <div className="text-xs text-white/50 truncate">{meta}</div>
        </div>
      </div>
      <Star className="w-4 h-4 text-white fill-current shrink-0 ml-2" />
    </Link>
  );
}

function ActivityItem({ target, action, notebookTitle, time, initials }: {
  target: string; action: string; notebookTitle: string; time: string; initials: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full border border-white bg-black flex items-center justify-center text-xs font-bold shrink-0">{initials}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white/70 leading-snug">
          <span className="font-medium text-white">You</span> {action} <span className="text-white italic">{target}</span>
          {notebookTitle && <span className="text-white/50"> in {notebookTitle}</span>}
        </div>
        <div className="text-xs text-white/50 mt-0.5">{time}</div>
      </div>
      <div className="w-1.5 h-1.5 rounded-full mt-2 bg-white shrink-0"></div>
    </div>
  );
}
`;

const outPath = resolve(__dirname, '../src/app/figma-dashboard/page.tsx');
writeFileSync(outPath, content, 'utf8');
console.log('Written:', outPath);
