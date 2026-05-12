"use client";

import React from 'react';
import Link from 'next/link';
import { 
  Search, Bell, Plus, ChevronDown, Book, FileText, 
  Star, Users, Trash2, Crown, LayoutGrid, List, MoreVertical, Pin
} from 'lucide-react';

export default function FigmaDashboard() {
  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white bg-black flex flex-col shrink-0">
        <div className="p-4 border-b border-white">
          <Link href="/" className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-white border border-white rounded flex items-center justify-center text-black text-[10px] font-bold">
              IB
            </div>
            <span className="font-medium text-white">Savant</span>
          </Link>
          
          <button className="w-full flex items-center justify-between text-left hover:bg-white/10 p-2 -mx-2 rounded-lg transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 border border-white rounded flex items-center justify-center text-xs">NU</div>
              <div>
                <div className="text-sm font-medium text-white">Northfield University</div>
                <div className="text-xs text-white/70">Student Workspace</div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-white/70" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {/* Workspace */}
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

          {/* Classes */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <div className="text-xs font-semibold text-white/70 tracking-wider">CLASSES</div>
              <Plus className="w-3.5 h-3.5 text-white/70 cursor-pointer hover:text-white" />
            </div>
            <nav className="space-y-0.5">
              <ClassItem label="Physics 201" pages={42} />
              <ClassItem label="Calculus II" pages={36} />
              <ClassItem label="History 101" pages={28} />
              <ClassItem label="Biology 150" pages={31} />
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors mt-1">
                <Plus className="w-4 h-4" />
                <span>Add class</span>
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
            <button className="w-full bg-white text-black text-sm font-medium py-1.5 rounded-md hover:bg-white/90 transition-colors">
              Go Pro
            </button>
          </div>
          
          <button className="w-full flex items-center justify-between hover:bg-white/10 p-2 -mx-2 rounded-lg transition-colors">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop" alt="Ava" className="w-8 h-8 rounded-full object-cover grayscale" />
              <div className="text-left">
                <div className="text-sm font-medium text-white">Ava Johnson</div>
                <div className="text-xs text-white/70">ava.johnson@northfield.edu</div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-white/70" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-white flex items-center justify-between px-6 bg-black">
          <div className="relative w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
            <input 
              type="text" 
              placeholder="Search notebooks, pages, or tags..." 
              className="w-full bg-black border border-white rounded-md pl-9 pr-12 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white transition-colors"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/70 border border-white/50 rounded px-1.5 py-0.5">⌘K</div>
          </div>

          <div className="flex items-center gap-4">
            <button className="bg-white text-black px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 hover:bg-white/90 transition-colors">
              <Plus className="w-4 h-4" />
              New
              <ChevronDown className="w-3 h-3 ml-1" />
            </button>
            <button className="relative text-white/70 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white border-2 border-black rounded-full text-black text-[8px] font-bold flex items-center justify-center">3</span>
            </button>
            <div className="flex items-center -space-x-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=64&h=64&fit=crop" className="w-7 h-7 rounded-full border-2 border-black object-cover grayscale" alt="" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop" className="w-7 h-7 rounded-full border-2 border-black object-cover grayscale" alt="" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=64&h=64&fit=crop" className="w-7 h-7 rounded-full border-2 border-black object-cover grayscale" alt="" />
              <div className="w-7 h-7 rounded-full border-2 border-black bg-black text-white text-xs flex items-center justify-center z-10">+2</div>
            </div>
          </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Page Title & Tabs */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">Notebooks</h1>
                  <p className="text-white/70 text-sm">Organize your ideas. Create without limits.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 border border-white rounded-md text-sm font-medium hover:bg-white/10 transition-colors">
                    <Plus className="w-4 h-4 text-white" />
                    New Notebook
                  </button>
                  <Link href="/figma-canvas" className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-md text-sm font-medium hover:bg-white/90 transition-colors">
                    <Plus className="w-4 h-4" />
                    New Page
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-2 border-b border-white pb-px">
                <Tab active>All</Tab>
                <Tab>Physics 201</Tab>
                <Tab>Calculus II</Tab>
                <Tab>History 101</Tab>
                <Tab>Biology 150</Tab>
                <button className="p-2 text-white/70 hover:text-white"><Plus className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Pages Overview */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-white">Pages overview</h2>
                  <span className="text-xs text-white/50">42 pages</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-white/70">
                  <button className="flex items-center gap-1 hover:text-white">
                    Sort by: Last edited
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <div className="flex items-center gap-1 border border-white rounded-md p-0.5">
                    <button className="p-1 bg-white text-black rounded"><LayoutGrid className="w-4 h-4" /></button>
                    <button className="p-1 hover:text-white rounded"><List className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <PageCard title="Projectile Motion" category="Physics 201" tag="Lecture Notes" time="2h ago" activePin />
                <PageCard title="Integrals & Substitution" category="Calculus II" tag="Homework Board" time="5h ago" />
                <PageCard title="Photosynthesis Mind Map" category="Biology 150" tag="Mind Map" time="1d ago" activePin />
                <PageCard title="French Revolution Notes" category="History 101" tag="Study Guide" time="1d ago" />
                
                <PageCard title="Untitled Page" category="Physics 201" tag="Notes" time="2d ago" empty />
                <PageCard title="Free Body Diagrams" category="Physics 201" tag="Homework Board" time="2d ago" activePin />
                <PageCard title="Series & Convergence" category="Calculus II" tag="Lecture Notes" time="3d ago" />
                <PageCard title="Organic Reactions" category="Biology 150" tag="Revision Sheet" time="3d ago" />
              </div>
            </div>

            {/* Bottom Widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Notes */}
              <Widget title="Recent notes">
                <div className="space-y-1">
                  <NoteListItem title="Energy Conservation" meta="Physics 201 • Edited 1h ago" activePin />
                  <NoteListItem title="Limits and Continuity" meta="Calculus II • Edited 6h ago" />
                  <NoteListItem title="Cell Structure Overview" meta="Biology 150 • Edited 1d ago" activePin />
                  <NoteListItem title="Causes of WWI" meta="History 101 • Edited 2d ago" activePin />
                  <NoteListItem title="Differential Equations" meta="Calculus II • Edited 3d ago" />
                </div>
              </Widget>

              {/* Favorite Pages */}
              <Widget title="Favorite pages">
                <div className="space-y-3">
                  <FavoriteCard title="Projectile Motion" meta="Physics 201 • Edited 2h ago" />
                  <FavoriteCard title="Photosynthesis Mind Map" meta="Biology 150 • Edited 1d ago" />
                  <FavoriteCard title="Free Body Diagrams" meta="Physics 201 • Edited 2d ago" />
                  <FavoriteCard title="Organic Reactions" meta="Biology 150 • Edited 3d ago" />
                </div>
              </Widget>

              {/* Activity */}
              <Widget title="Activity">
                <div className="space-y-4">
                  <ActivityItem 
                    user="You" action="edited" target="Projectile Motion" time="2h ago"
                    avatar="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop"
                  />
                  <ActivityItem 
                    user="Emma Wilson" action="commented on" target="Integrals & Substitution" time="5h ago"
                    avatar="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop"
                  />
                  <ActivityItem 
                    user="Liam Chen" action="shared" target="Photosynthesis Mind Map" targetSuffix="with you" time="1d ago"
                    avatar="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=64&h=64&fit=crop"
                  />
                  <ActivityItem 
                    user="You" action="pinned" target="Free Body Diagrams" time="2d ago"
                    avatar="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop"
                  />
                </div>
              </Widget>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Subcomponents
function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-white text-black font-medium' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ClassItem({ label, pages }: { label: string; pages: number }) {
  return (
    <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold border border-white text-white">
          {label[0]}
        </div>
        <div className="text-left">
          <div className="text-sm text-white">{label}</div>
          <div className="text-xs text-white/50">{pages} pages</div>
        </div>
      </div>
    </button>
  );
}

function Tab({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${active ? 'border-white text-white' : 'border-transparent text-white/70 hover:text-white'}`}>
      {children}
    </button>
  );
}

function PageCard({ title, category, tag, time, activePin = false, empty = false }: {
  title: string; category: string; tag: string; time: string; activePin?: boolean; empty?: boolean;
}) {
  return (
    <Link href="/figma-canvas" className="bg-black border border-white hover:bg-white/5 rounded-xl overflow-hidden flex flex-col group cursor-pointer transition-colors">
      <div className="h-32 bg-black relative border-b border-white" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)', backgroundSize: '16px 16px' }}>
        <button className="absolute top-2 left-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
          {activePin ? <Pin className="w-4 h-4 fill-current" /> : <Pin className="w-4 h-4" />}
        </button>
        <button className="absolute top-2 right-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <Star className="w-4 h-4" />
        </button>
        {!empty && (
          <div className="absolute inset-4 flex items-center justify-center opacity-40">
            <div className="w-full h-full border border-dashed border-white rounded-lg"></div>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-sm font-medium text-white truncate pr-2">{title}</h3>
          <button className="text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-white text-white/70 bg-black">{tag}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-white/50">
          <div className="flex gap-2">
            <span>{category}</span>
            <span>Edited {time}</span>
          </div>
          {!empty && (
            <div className="flex -space-x-1 opacity-60">
              <div className="w-4 h-4 rounded-full border border-white bg-black"></div>
              <div className="w-4 h-4 rounded-full border border-white bg-black"></div>
            </div>
          )}
        </div>
      </div>
    </Link>
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

function NoteListItem({ title, meta, activePin = false }: { title: string; meta: string; activePin?: boolean }) {
  return (
    <div className="flex items-center justify-between p-2 hover:bg-white/10 rounded-lg group cursor-pointer border border-transparent hover:border-white">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-black border border-white flex items-center justify-center text-white/70">
          <FileText className="w-4 h-4" />
        </div>
        <div>
          <div className="text-sm font-medium text-white">{title}</div>
          <div className="text-xs text-white/50">{meta}</div>
        </div>
      </div>
      {activePin ? (
        <Pin className="w-4 h-4 text-white fill-current" />
      ) : (
        <Pin className="w-4 h-4 text-white/50 opacity-0 group-hover:opacity-100 hover:text-white transition-all" />
      )}
    </div>
  );
}

function FavoriteCard({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-center justify-between p-2 hover:bg-white/10 border border-white rounded-lg group cursor-pointer bg-black">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-black border border-white relative overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '8px 8px' }}>
          <div className="absolute inset-1 border border-dashed border-white rounded-sm opacity-50"></div>
        </div>
        <div>
          <div className="text-sm font-medium text-white">{title}</div>
          <div className="text-xs text-white/50">{meta}</div>
        </div>
      </div>
      <Star className="w-4 h-4 text-white fill-current" />
    </div>
  );
}

function ActivityItem({ user, action, target, targetSuffix, time, avatar }: {
  user: string; action: string; target: string; targetSuffix?: string; time: string; avatar: string;
}) {
  return (
    <div className="flex items-start gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={avatar} className="w-8 h-8 rounded-full object-cover grayscale border border-white" alt={user} />
      <div className="flex-1">
        <div className="text-sm text-white/70 leading-snug">
          <span className="font-medium text-white">{user}</span> {action} <span className="text-white italic">{target}</span> {targetSuffix}
        </div>
        <div className="text-xs text-white/50 mt-0.5">{time}</div>
      </div>
      <div className="w-1.5 h-1.5 rounded-full mt-2 bg-white"></div>
    </div>
  );
}
