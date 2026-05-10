"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Share,
  Plus,
  MousePointer2,
  PenTool,
  Eraser,
  Triangle,
  ArrowUpRight,
  Type,
  Image as ImageIcon,
  StickyNote,
  Table,
  Square,
  Calculator,
  Undo,
  Redo,
  MoreHorizontal,
  Files,
  LayoutTemplate,
  Shapes,
  Search,
  Minus,
  HelpCircle,
  PlayCircle,
  Maximize2,
  Move,
  Grid,
  CheckCircle2,
} from "lucide-react";

// Canvas - Page editor with sidebars, floating toolbar, and dot-grid canvas.

export default function CanvasPage() {
  const [activeTool, setActiveTool] = useState("pen");

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden select-none">
      {/* ── Primary Sidebar (icon strip) ── */}
      <aside className="w-16 border-r border-white/20 bg-black flex flex-col items-center py-4 gap-1 shrink-0">
        {/* IB logo */}
        <Link href="/dashboard" className="mb-4">
          <div className="w-8 h-8 bg-white border border-white rounded flex items-center justify-center text-black text-[10px] font-bold hover:bg-gray-200 transition-colors">
            IB
          </div>
        </Link>

        <div className="flex flex-col items-center gap-1 flex-1">
          <IconBtn icon={<Files className="w-5 h-5" />} label="Pages" active />
          <IconBtn icon={<LayoutTemplate className="w-5 h-5" />} label="Templates" />
          <IconBtn icon={<Shapes className="w-5 h-5" />} label="Shapes" />
          <IconBtn icon={<ImageIcon className="w-5 h-5" />} label="Images" />
          <IconBtn icon={<Search className="w-5 h-5" />} label="Search" />
        </div>

        {/* Bottom: settings */}
        <div className="flex flex-col items-center gap-1">
          <IconBtn icon={<Grid className="w-5 h-5" />} label="Grid" />
        </div>
      </aside>

      {/* ── Secondary Sidebar (pages list) ── */}
      <aside className="w-64 border-r border-white/20 bg-black flex flex-col shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
          <span className="text-sm font-semibold text-white">Pages</span>
          <button className="text-white/50 hover:text-white transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          <PageItem number={1} title="Projectile Motion" active />
          <PageItem number={2} title="Free Body Diagrams" />
          <PageItem number={3} title="Energy Conservation" />
          <PageItem number={4} title="Circular Motion" />
          <PageItem number={5} title="Wave Properties" />
          <PageItem number={6} title="Thermodynamics" />
          <PageItem number={7} title="Electric Fields" />
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors mt-2">
            <Plus className="w-4 h-4" />
            Add page
          </button>
        </div>
      </aside>

      {/* ── Main canvas area ── */}
      <main className="flex-1 relative overflow-hidden bg-black">
        {/* Dot-grid background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.18) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* ── Absolute header (breadcrumb + share) ── */}
        <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-3 bg-linear-to-b from-black/60 to-transparent pointer-events-none">
          <div className="flex items-center gap-1 text-sm pointer-events-auto">
            <Link
              href="/dashboard"
              className="text-white/50 hover:text-white transition-colors"
            >
              Physics 201
            </Link>
            <ChevronRight className="w-4 h-4 text-white/30" />
            <span className="text-white font-medium">Projectile Motion</span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Collaborator avatars */}
            <div className="flex items-center -space-x-1.5">
              {["AJ", "EW", "LC"].map((initials) => (
                <div
                  key={initials}
                  className="w-7 h-7 rounded-full bg-white/10 border-2 border-black flex items-center justify-center text-[9px] font-bold text-white"
                  title={initials}
                >
                  {initials}
                </div>
              ))}
            </div>

            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-white/30 rounded-md text-sm hover:bg-white/10 transition-colors">
              <Share className="w-3.5 h-3.5" />
              Share
            </button>
          </div>
        </header>

        {/* ── Floating toolbar (centered, top) ── */}
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 bg-black border border-white/30 rounded-xl px-2 py-1.5 shadow-2xl">
          <ToolbarBtn icon={<MousePointer2 className="w-4 h-4" />} label="Select" toolId="select" activeTool={activeTool} setActiveTool={setActiveTool} />
          <ToolbarBtn icon={<PenTool className="w-4 h-4" />} label="Pen" toolId="pen" activeTool={activeTool} setActiveTool={setActiveTool} />
          <ToolbarBtn icon={<Eraser className="w-4 h-4" />} label="Eraser" toolId="eraser" activeTool={activeTool} setActiveTool={setActiveTool} />

          <div className="w-px h-5 bg-white/20 mx-1" />

          <ToolbarBtn icon={<Triangle className="w-4 h-4" />} label="Shapes" toolId="shapes" activeTool={activeTool} setActiveTool={setActiveTool} />
          <ToolbarBtn icon={<ArrowUpRight className="w-4 h-4" />} label="Arrow" toolId="arrow" activeTool={activeTool} setActiveTool={setActiveTool} />
          <ToolbarBtn icon={<Type className="w-4 h-4" />} label="Text" toolId="type" activeTool={activeTool} setActiveTool={setActiveTool} />
          <ToolbarBtn icon={<ImageIcon className="w-4 h-4" />} label="Image" toolId="image" activeTool={activeTool} setActiveTool={setActiveTool} />
          <ToolbarBtn icon={<StickyNote className="w-4 h-4" />} label="Note" toolId="note" activeTool={activeTool} setActiveTool={setActiveTool} />
          <ToolbarBtn icon={<Table className="w-4 h-4" />} label="Table" toolId="table" activeTool={activeTool} setActiveTool={setActiveTool} />
          <ToolbarBtn icon={<Square className="w-4 h-4" />} label="Square" toolId="square" activeTool={activeTool} setActiveTool={setActiveTool} />
          <ToolbarBtn icon={<Calculator className="w-4 h-4" />} label="Formula" toolId="formula" activeTool={activeTool} setActiveTool={setActiveTool} />

          <div className="w-px h-5 bg-white/20 mx-1" />

          <ToolbarBtn icon={<Undo className="w-4 h-4" />} label="Undo" toolId="undo" activeTool={activeTool} setActiveTool={setActiveTool} />
          <ToolbarBtn icon={<Redo className="w-4 h-4" />} label="Redo" toolId="redo" activeTool={activeTool} setActiveTool={setActiveTool} />
          <ToolbarBtn icon={<MoreHorizontal className="w-4 h-4" />} label="More" toolId="more" activeTool={activeTool} setActiveTool={setActiveTool} />
        </div>

        {/* ── Canvas scroll area ── */}
        <div className="absolute inset-0 overflow-auto pt-24 pb-20 pl-8 pr-8">
          <div className="relative min-w-225 min-h-175">
            {/* Page title block */}
            <div className="absolute top-8 left-12">
              <div className="text-xs text-white/30 mb-1 font-mono tracking-widest uppercase">Physics 201</div>
              <h1 className="text-3xl font-bold text-white mb-2">Projectile Motion</h1>
              <div className="flex items-center gap-3 text-xs text-white/40">
                <span>Page 1 of 7</span>
                <span>•</span>
                <span>Edited 2h ago</span>
              </div>
            </div>

            {/* Key equation */}
            <div
              className="absolute top-8 right-16 bg-black border border-white/20 rounded-xl p-5 w-72"
            >
              <div className="text-xs font-mono text-white/40 mb-3 tracking-widest uppercase">Key Equations</div>
              <div className="space-y-2 font-mono text-white">
                <div className="text-lg">x = v₀cos(θ)t</div>
                <div className="text-lg">y = v₀sin(θ)t − ½gt²</div>
                <div className="text-sm text-white/40 mt-3">g = 9.8 m/s²</div>
              </div>
            </div>

            {/* Parabola diagram */}
            <div className="absolute top-52 left-12 bg-black border border-white/20 rounded-xl p-5 w-96">
              <div className="text-xs font-mono text-white/40 mb-3 tracking-widest uppercase">
                Trajectory Diagram
              </div>
              <svg viewBox="0 0 300 140" className="w-full opacity-80">
                {/* Axes */}
                <line x1="20" y1="120" x2="290" y2="120" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                <line x1="20" y1="10" x2="20" y2="120" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                {/* Axis labels */}
                <text x="282" y="130" fill="rgba(255,255,255,0.4)" fontSize="10">x</text>
                <text x="10" y="14" fill="rgba(255,255,255,0.4)" fontSize="10">y</text>
                {/* Parabola */}
                <path
                  d="M 20 120 Q 155 10 290 120"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                />
                {/* Launch angle indicator */}
                <line x1="20" y1="120" x2="55" y2="92" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeDasharray="4 2" />
                <text x="35" y="108" fill="rgba(255,255,255,0.5)" fontSize="9">θ</text>
                {/* Peak dot */}
                <circle cx="155" cy="15" r="3" fill="white" />
                <text x="160" y="14" fill="rgba(255,255,255,0.5)" fontSize="9">H</text>
                {/* Range label */}
                <text x="130" y="135" fill="rgba(255,255,255,0.4)" fontSize="9">Range R</text>
              </svg>
            </div>

            {/* Key takeaways card */}
            <div className="absolute top-52 right-16 bg-black border border-white/20 rounded-xl p-5 w-64">
              <div className="text-xs font-mono text-white/40 mb-3 tracking-widest uppercase">
                Key Takeaways
              </div>
              <ul className="space-y-2">
                {[
                  "Horizontal velocity is constant",
                  "Vertical motion is affected by gravity",
                  "Range ∝ sin(2θ)",
                  "Max range at θ = 45°",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-2 text-xs text-white/70">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white mt-0.5 shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Video card */}
            <div className="absolute top-120 left-12 bg-black border border-white/20 rounded-xl overflow-hidden w-80">
              <div
                className="h-36 bg-black relative flex items-center justify-center border-b border-white/20"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)",
                  backgroundSize: "16px 16px",
                }}
              >
                <div className="w-12 h-12 rounded-full bg-white/10 border border-white/30 flex items-center justify-center hover:bg-white/20 cursor-pointer transition-colors">
                  <PlayCircle className="w-7 h-7 text-white" />
                </div>
                <div className="absolute bottom-2 left-3 text-[10px] text-white/40 font-mono">8:42</div>
              </div>
              <div className="p-3">
                <div className="text-sm font-medium text-white">Projectile Motion — Worked Example</div>
                <div className="text-xs text-white/40 mt-1">Khan Academy Physics</div>
              </div>
            </div>

            {/* Handwritten-style note */}
            <div
              className="absolute top-120 right-16 bg-black border border-white/20 rounded-xl p-5 w-64"
              style={{ transform: "rotate(1deg)" }}
            >
              <div className="text-xs font-mono text-white/30 mb-2 tracking-widest uppercase">Note</div>
              <p className="text-sm text-white/70 leading-relaxed">
                Remember: break every problem into x and y components first. Gravity only acts on y!
              </p>
            </div>
          </div>
        </div>

        {/* ── Bottom controls ── */}
        {/* Zoom controls (bottom right) */}
        <div className="absolute bottom-5 right-5 z-20 flex items-center gap-1">
          {/* Minimap */}
          <div
            className="w-36 h-24 bg-black border border-white/20 rounded-lg mr-2 overflow-hidden relative"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)",
              backgroundSize: "8px 8px",
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-10 border border-white/30 rounded" />
            </div>
            <div className="absolute top-1 left-2 text-[8px] text-white/20 font-mono uppercase tracking-widest">
              Minimap
            </div>
          </div>

          <div className="flex items-center bg-black border border-white/20 rounded-lg overflow-hidden">
            <button className="px-2 py-1.5 hover:bg-white/10 transition-colors border-r border-white/20">
              <Minus className="w-4 h-4 text-white/60" />
            </button>
            <span className="px-3 text-xs text-white/60 font-mono min-w-12 text-center">100%</span>
            <button className="px-2 py-1.5 hover:bg-white/10 transition-colors border-l border-white/20">
              <Plus className="w-4 h-4 text-white/60" />
            </button>
          </div>

          <button className="p-2 bg-black border border-white/20 rounded-lg hover:bg-white/10 transition-colors">
            <Grid className="w-4 h-4 text-white/60" />
          </button>
          <button className="p-2 bg-black border border-white/20 rounded-lg hover:bg-white/10 transition-colors">
            <Maximize2 className="w-4 h-4 text-white/60" />
          </button>
          <button className="p-2 bg-black border border-white/20 rounded-lg hover:bg-white/10 transition-colors">
            <HelpCircle className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Hand/move tool (bottom left) */}
        <div className="absolute bottom-5 left-5 z-20">
          <button
            onClick={() => setActiveTool("hand")}
            className={`p-2 border rounded-lg transition-colors ${
              activeTool === "hand"
                ? "bg-white text-black border-white"
                : "bg-black border-white/20 text-white/60 hover:bg-white/10"
            }`}
            title="Hand / Pan"
          >
            <Move className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
}

// ── Sub-components ──

function IconBtn({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      title={label}
      className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
        active
          ? "bg-white text-black"
          : "text-white/40 hover:text-white hover:bg-white/10"
      }`}
    >
      {icon}
    </button>
  );
}

function PageItem({
  number,
  title,
  active = false,
}: {
  number: number;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors group ${
        active ? "bg-white/10 border border-white/30" : "hover:bg-white/10 border border-transparent"
      }`}
    >
      {/* Page thumbnail preview */}
      <div
        className="w-10 h-8 rounded border border-white/20 shrink-0 relative overflow-hidden bg-black"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
          backgroundSize: "6px 6px",
        }}
      >
        <div className="absolute inset-1 flex flex-col gap-0.5 opacity-40">
          <div className="h-px bg-white w-full" />
          <div className="h-px bg-white w-3/4" />
          <div className="h-px bg-white w-1/2" />
        </div>
        <div className="absolute top-0.5 right-0.5 text-[7px] font-mono text-white/40">
          {number}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={`text-sm truncate ${active ? "text-white font-medium" : "text-white/60 group-hover:text-white"}`}
        >
          {title}
        </div>
      </div>
    </button>
  );
}

function ToolbarBtn({
  icon,
  label,
  toolId,
  activeTool,
  setActiveTool,
}: {
  icon: React.ReactNode;
  label: string;
  toolId: string;
  activeTool: string;
  setActiveTool: (t: string) => void;
}) {
  const isActive = activeTool === toolId;
  return (
    <button
      onClick={() => setActiveTool(toolId)}
      title={label}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
        isActive
          ? "bg-white text-black"
          : "text-white/50 hover:text-white hover:bg-white/10"
      }`}
    >
      {icon}
    </button>
  );
}
