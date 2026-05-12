"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ChevronRight, CheckCircle2, Share, Plus, Settings, Trash2,
  MousePointer2, PenTool, Eraser, Triangle, ArrowUpRight, Type, Image as ImageIcon, 
  StickyNote, Table, Square, Calculator, Undo, Redo, MoreHorizontal,
  Files, LayoutTemplate, Shapes, Search, Grid, Minus, HelpCircle,
  PlayCircle, Maximize2, Move
} from 'lucide-react';

export default function FigmaCanvas() {
  const [activeTool, setActiveTool] = useState('pen');

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Primary Sidebar (Icons) */}
      <aside className="w-16 border-r border-white bg-black flex flex-col items-center py-4 shrink-0 z-20">
        <Link href="/figma-dashboard" className="mb-8 w-8 h-8 bg-white border border-white rounded flex items-center justify-center text-black text-xs font-bold">
          IB
        </Link>
        
        <div className="flex-1 space-y-6">
          <ToolIcon icon={<Files />} label="Pages" active />
          <ToolIcon icon={<LayoutTemplate />} label="Templates" />
          <ToolIcon icon={<Shapes />} label="Elements" />
          <ToolIcon icon={<ImageIcon />} label="Images" />
          <ToolIcon icon={<Search />} label="Search" />
        </div>

        <div className="space-y-6 mt-auto">
          <ToolIcon icon={<Settings />} label="Settings" />
          <ToolIcon icon={<Trash2 />} label="Trash" />
        </div>
      </aside>

      {/* Secondary Sidebar (Pages List) */}
      <aside className="w-64 border-r border-white bg-black flex flex-col shrink-0 z-20">
        <div className="p-4 flex items-center justify-between border-b border-white">
          <h2 className="font-semibold text-white">Pages</h2>
          <MoreHorizontal className="w-4 h-4 text-white/70 cursor-pointer" />
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <PageItem number="1" title="Projectile Motion" active />
          <PageItem number="2" title="Forces & Vectors" />
          <PageItem number="3" title="Kinematics Basics" />
          <PageItem number="4" title="Energy Principles" />
          <PageItem number="5" title="Practice Problems" />
          
          <button className="w-full mt-4 flex items-center gap-2 justify-center py-2 border border-white hover:bg-white/10 rounded-lg text-sm text-white/70 hover:text-white transition-colors">
            <Plus className="w-4 h-4" />
            New page
          </button>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 relative flex flex-col overflow-hidden bg-black" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
        
        {/* Top Header */}
        <header className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-6 z-10 bg-gradient-to-b from-black to-transparent">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Link href="/figma-dashboard" className="hover:text-white transition-colors">Physics 201</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white font-medium">Projectile Motion</span>
            <ChevronRight className="w-4 h-4" />
            <div className="ml-4 flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              Saved
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center -space-x-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop" className="w-7 h-7 rounded-full border-2 border-black grayscale" alt="" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=64&h=64&fit=crop" className="w-7 h-7 rounded-full border-2 border-black grayscale" alt="" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop" className="w-7 h-7 rounded-full border-2 border-black grayscale" alt="" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=64&h=64&fit=crop" className="w-7 h-7 rounded-full border-2 border-black grayscale" alt="" />
              <div className="w-7 h-7 rounded-full border-2 border-white bg-black text-white text-xs flex items-center justify-center z-10">+3</div>
            </div>
            <button className="bg-white text-black px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-white/90 transition-colors">
              <Share className="w-4 h-4" />
              Share
            </button>
          </div>
        </header>

        {/* Floating Toolbar */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black border border-white rounded-xl shadow-2xl px-2 py-1.5 flex items-center gap-1 z-20">
          <ToolbarBtn icon={<MousePointer2 />} active={activeTool === 'select'} onClick={() => setActiveTool('select')} />
          <ToolbarBtn icon={<PenTool />} active={activeTool === 'pen'} onClick={() => setActiveTool('pen')} highlight />
          <ToolbarBtn icon={<Eraser />} active={activeTool === 'eraser'} onClick={() => setActiveTool('eraser')} />
          <div className="w-px h-6 bg-white mx-1"></div>
          <ToolbarBtn icon={<Triangle />} onClick={() => setActiveTool('triangle')} />
          <ToolbarBtn icon={<ArrowUpRight />} onClick={() => setActiveTool('arrow')} />
          <ToolbarBtn icon={<Type />} onClick={() => setActiveTool('text')} />
          <ToolbarBtn icon={<ImageIcon />} onClick={() => setActiveTool('image')} />
          <ToolbarBtn icon={<StickyNote />} onClick={() => setActiveTool('note')} />
          <ToolbarBtn icon={<Table />} onClick={() => setActiveTool('table')} />
          <ToolbarBtn icon={<Square />} onClick={() => setActiveTool('rect')} />
          <ToolbarBtn icon={<Calculator />} onClick={() => setActiveTool('calc')} />
          <div className="w-px h-6 bg-white mx-1"></div>
          <ToolbarBtn icon={<Undo />} />
          <ToolbarBtn icon={<Redo />} />
          <ToolbarBtn icon={<MoreHorizontal />} />
        </div>

        {/* Canvas Content (Scrollable Area) */}
        <div className="flex-1 w-full h-full relative overflow-auto pt-24 px-12 pb-32">
          
          <div className="relative w-[1200px] h-[900px] mx-auto">
            {/* Title & Given */}
            <div className="absolute top-0 left-0">
              <h1 className="text-white text-5xl mb-6 italic">Projectile Motion</h1>
              <div className="space-y-4">
                <div className="text-2xl text-white italic">Given:</div>
                <div className="flex items-center gap-4 text-white">
                  <span className="italic text-xl">v<sub>0</sub></span>
                  <span>= initial velocity</span>
                </div>
                <div className="flex items-center gap-4 text-white">
                  <span className="italic text-xl">θ</span>
                  <span>= launch angle</span>
                </div>
                <div className="flex items-center gap-4 text-white">
                  <span className="italic text-xl">g</span>
                  <span>= 9.81 m/s²</span>
                </div>
              </div>
            </div>

            {/* Parabola Graph */}
            <div className="absolute top-8 left-80 w-[400px] h-[200px]">
              <svg width="100%" height="100%" viewBox="0 0 400 200" className="overflow-visible">
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="white" />
                  </marker>
                  <marker id="arrow-white" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="white" />
                  </marker>
                </defs>
                <path d="M 50 180 L 380 180" stroke="white" strokeWidth="1.5" markerEnd="url(#arrow)" />
                <path d="M 50 180 L 50 20" stroke="white" strokeWidth="1.5" markerEnd="url(#arrow)" />
                <text x="390" y="185" fill="white" fontSize="14" fontStyle="italic">x</text>
                <text x="35" y="15" fill="white" fontSize="14" fontStyle="italic">y</text>
                <text x="200" y="205" fill="white" fontSize="14">Range (R)</text>
                <path d="M 50 190 L 50 195 L 350 195 L 350 190" stroke="white" strokeWidth="1" fill="none" />
                <path d="M 50 180 L 50 190" stroke="white" strokeWidth="1" />
                <path d="M 350 180 L 350 190" stroke="white" strokeWidth="1" />
                <path d="M 50 180 Q 200 -50 350 180" stroke="white" strokeWidth="2" strokeDasharray="6,6" fill="none" />
                <path d="M 50 180 L 120 75" stroke="white" strokeWidth="2" markerEnd="url(#arrow-white)" />
                <text x="125" y="70" fill="white" fontSize="14" fontStyle="italic">v<tspan dy="5" fontSize="10">0</tspan></text>
                <path d="M 80 180 A 30 30 0 0 0 68 152" stroke="white" strokeWidth="1.5" fill="none" />
                <text x="90" y="170" fill="white" fontSize="14" fontStyle="italic">θ</text>
              </svg>
            </div>

            {/* Key Equations Block */}
            <div className="absolute top-64 left-0 w-72 border-2 border-white rounded-xl p-5 bg-black shadow-lg">
              <h3 className="text-white text-2xl mb-4 italic">Key Equations</h3>
              <div className="space-y-4 text-white">
                <div>x(t) = v<sub className="text-xs">0</sub> cosθ · t</div>
                <div>y(t) = v<sub className="text-xs">0</sub> sinθ · t - ½ gt²</div>
                <div className="flex items-center gap-2">
                  <span>T =</span>
                  <div className="flex flex-col items-center">
                    <span className="border-b border-white px-1">2v<sub className="text-xs">0</sub> sinθ</span>
                    <span>g</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span>R =</span>
                  <div className="flex flex-col items-center">
                    <span className="border-b border-white px-1">v<sub className="text-xs">0</sub>² sin 2θ</span>
                    <span>g</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span>H<sub className="text-xs">max</sub> =</span>
                  <div className="flex flex-col items-center">
                    <span className="border-b border-white px-1">v<sub className="text-xs">0</sub>² sin² θ</span>
                    <span>2g</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Understanding the Trajectory Block */}
            <div className="absolute top-72 left-80 w-80 bg-black border border-white rounded-xl p-5 shadow-lg">
              <h3 className="text-white text-2xl mb-3 italic">Understanding the Trajectory</h3>
              <p className="text-white/70 text-sm leading-relaxed mb-6">
                The object follows a parabolic path due to the constant downward acceleration of gravity. 
                Horizontal motion is uniform, while vertical motion is affected by gravity.
              </p>
              <div className="h-32 relative flex items-center justify-center">
                <svg width="100%" height="100%" viewBox="0 0 250 100" className="overflow-visible">
                  <path d="M 20 80 Q 125 -20 230 80" stroke="white" strokeWidth="2" strokeDasharray="4,4" fill="none" />
                  <circle cx="20" cy="80" r="4" fill="white" />
                  <path d="M 20 80 L 20 40" stroke="white" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <path d="M 20 80 L 60 80" stroke="white" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <path d="M 20 80 L 50 50" stroke="white" strokeWidth="2" markerEnd="url(#arrow-white)" />
                  <circle cx="125" cy="30" r="4" fill="white" />
                  <path d="M 125 30 L 125 60" stroke="white" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <path d="M 125 30 L 165 30" stroke="white" strokeWidth="2" markerEnd="url(#arrow-white)" />
                  <circle cx="200" cy="65" r="4" fill="white" />
                  <path d="M 200 65 L 200 95" stroke="white" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <path d="M 200 65 L 230 65" stroke="white" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <path d="M 200 65 L 220 85" stroke="white" strokeWidth="2" markerEnd="url(#arrow-white)" />
                </svg>
              </div>
            </div>

            {/* Key Takeaways */}
            <div className="absolute top-16 right-0 w-80">
              <h3 className="text-white text-2xl mb-4 border-b border-white pb-2 inline-block italic">Key Takeaways</h3>
              <ul className="space-y-3 text-2xl text-white italic">
                <li className="flex items-start gap-2">
                  <span className="text-white mt-1">•</span>
                  <span>Max height occurs at v<sub className="text-sm not-italic">y</sub> = 0</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white mt-1">•</span>
                  <span>Path is a parabola</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white mt-1">•</span>
                  <span>Neglect air resistance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white mt-1">•</span>
                  <span>Horizontal velocity is constant</span>
                </li>
              </ul>
            </div>

            {/* Free Body Diagram */}
            <div className="absolute top-72 right-12">
              <h3 className="text-white text-2xl mb-2 italic">Free Body Diagram</h3>
              <div className="w-48 h-48 relative">
                <svg width="100%" height="100%" viewBox="0 0 150 150" className="overflow-visible">
                  <path d="M 75 75 L 120 75" stroke="white" strokeWidth="1" strokeDasharray="4,4" markerEnd="url(#arrow)" />
                  <path d="M 75 75 L 75 30" stroke="white" strokeWidth="1" strokeDasharray="4,4" markerEnd="url(#arrow)" />
                  <text x="125" y="80" fill="white" fontSize="12" fontStyle="italic">x</text>
                  <text x="65" y="25" fill="white" fontSize="12" fontStyle="italic">y</text>
                  <circle cx="75" cy="75" r="8" fill="white" />
                  <path d="M 75 75 L 75 130" stroke="white" strokeWidth="2" markerEnd="url(#arrow-white)" />
                  <text x="85" y="125" fill="white" fontSize="14" fontStyle="italic">mg</text>
                  <path d="M 75 75 L 45 45" stroke="white" strokeWidth="2" markerEnd="url(#arrow-white)" />
                  <text x="35" y="40" fill="white" fontSize="12" fontStyle="italic">F<tspan dy="4" fontSize="8">air</tspan></text>
                </svg>
              </div>
            </div>

            {/* Video Note */}
            <div className="absolute top-[420px] right-0 w-80 bg-black border border-white rounded-xl overflow-hidden shadow-lg flex flex-col">
              <div className="flex h-32 relative group cursor-pointer border-b border-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://images.unsplash.com/photo-1517976487492-5750f3195933?w=400&h=300&fit=crop" className="w-1/2 object-cover grayscale" alt="" />
                <div className="absolute left-1/4 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 border border-white rounded-full flex items-center justify-center text-white backdrop-blur-sm group-hover:bg-black/70 transition-colors">
                  <PlayCircle className="w-6 h-6" />
                </div>
                <div className="absolute left-2 bottom-2 bg-black/80 border border-white text-white text-[10px] px-1.5 py-0.5 rounded">02:45</div>
                <div className="w-1/2 p-3 bg-black flex flex-col justify-center border-l border-white">
                  <h4 className="text-sm font-medium text-white mb-1">Launch Analysis</h4>
                  <div className="text-xs text-white/70 space-y-0.5">
                    <div>Mass: 532,000 kg</div>
                    <div>Thrust: 7.6 MN</div>
                    <div>Max alt: 215 km</div>
                  </div>
                </div>
              </div>
              <div className="px-3 py-2 flex items-center justify-between text-xs text-white/70 bg-black">
                <span>Notes</span>
                <div className="flex gap-2">
                  <ArrowUpRight className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
                  <MoreHorizontal className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
                </div>
              </div>
              <div className="absolute -right-16 top-1/2 transform rotate-12">
                <div className="text-white text-xl italic">Watch<br/>video</div>
              </div>
            </div>

            {/* Example Block */}
            <div className="absolute top-[550px] left-80 w-[350px]">
              <h3 className="text-white text-2xl mb-2 italic">Example</h3>
              <p className="text-white/70 text-sm mb-4 italic">
                If v<sub className="text-[10px]">0</sub> = 50 m/s and θ = 45°,<br/>what is the range?
              </p>
              <div className="text-white text-lg space-y-4">
                <div className="flex items-center gap-4">
                  <span>R =</span>
                  <div className="flex flex-col items-center">
                    <span className="border-b border-white px-2">v<sub className="text-xs">0</sub>² sin 2θ</span>
                    <span>g</span>
                  </div>
                  <span>=</span>
                  <div className="flex flex-col items-center">
                    <span className="border-b border-white px-2">50² sin 90°</span>
                    <span>9.81</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-8">
                  <span>=</span>
                  <div className="flex flex-col items-center">
                    <span className="border-b border-white px-2">2500 · 1</span>
                    <span>9.81</span>
                  </div>
                  <span>=</span>
                  <div className="relative">
                    <span className="relative z-10 px-2 py-1">254.8 m</span>
                    <svg className="absolute -inset-2 w-[120%] h-[150%] z-0" viewBox="0 0 100 40" preserveAspectRatio="none">
                      <path d="M 10 20 C 10 5, 90 5, 90 20 C 90 35, 10 35, 10 20" stroke="white" strokeWidth="2" fill="none" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Factors Mind Map */}
            <div className="absolute top-[600px] left-0 w-72 bg-black border border-white rounded-xl p-5 shadow-lg">
              <h3 className="text-white text-2xl mb-6 italic">Factors Affecting Range</h3>
              <div className="relative h-48 flex items-center justify-center">
                <div className="absolute inset-0 z-0">
                  <svg width="100%" height="100%" viewBox="0 0 250 180">
                    <path d="M 125 90 C 80 40, 50 50, 50 50" stroke="white" strokeWidth="1.5" fill="none" />
                    <path d="M 125 90 C 180 40, 200 50, 200 50" stroke="white" strokeWidth="1.5" fill="none" />
                    <path d="M 125 90 C 60 140, 50 130, 50 130" stroke="white" strokeWidth="1.5" fill="none" />
                    <path d="M 125 90 C 190 140, 200 130, 200 130" stroke="white" strokeWidth="1.5" fill="none" />
                  </svg>
                </div>
                <div className="relative z-10 border-2 border-white rounded-[40px] px-6 py-3 bg-black text-white font-medium text-lg shadow-lg">
                  Range (R)
                </div>
                <div className="absolute top-4 left-4 z-10 border border-white rounded-[30px] px-3 py-1.5 bg-black text-xs text-white">
                  Initial Velocity
                </div>
                <div className="absolute top-4 right-4 z-10 border border-white rounded-[30px] px-3 py-1.5 bg-black text-xs text-white">
                  Launch Angle
                </div>
                <div className="absolute bottom-10 left-4 z-10 border border-white rounded-[30px] px-3 py-1.5 bg-black text-xs text-white">
                  Gravity
                </div>
                <div className="absolute bottom-4 right-10 z-10 border border-white rounded-[30px] px-3 py-1.5 bg-black text-xs text-white">
                  Air Resistance
                </div>
                <div className="absolute bottom-12 right-0 z-10 border border-white rounded-[30px] px-3 py-1.5 bg-black text-xs text-white">
                  Release Height
                </div>
              </div>
            </div>

            {/* Check Your Understanding */}
            <div className="absolute top-[680px] right-12 w-80">
              <h3 className="text-white text-2xl mb-4 italic">Check Your Understanding</h3>
              <div className="space-y-3 text-sm text-white">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="mt-0.5 w-4 h-4 border border-white rounded bg-black group-hover:bg-white/20 transition-colors"></div>
                  <span>Why is the path a parabola?</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="mt-0.5 w-4 h-4 border border-white rounded bg-black group-hover:bg-white/20 transition-colors"></div>
                  <span>How does increasing <span className="italic">θ</span> affect R?</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="mt-0.5 w-4 h-4 border border-white rounded bg-black group-hover:bg-white/20 transition-colors"></div>
                  <span>What is the effect of air resistance?</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="mt-0.5 w-4 h-4 border border-white rounded bg-black group-hover:bg-white/20 transition-colors"></div>
                  <span>Derive the time of flight equation.</span>
                </label>
              </div>
            </div>

          </div>
        </div>

        {/* Hand tool icon bottom center */}
        <div className="absolute bottom-6 left-64 w-10 h-10 bg-black border border-white rounded-lg shadow-lg flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors z-20">
          <Move className="w-5 h-5 text-white" />
        </div>

        {/* Bottom Minimap & Controls */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-4 items-end z-20">
          {/* Minimap */}
          <div className="w-40 h-28 bg-black/80 backdrop-blur border border-white rounded-xl p-2 shadow-xl relative">
            <div className="absolute inset-2 border border-white rounded-md opacity-50 bg-white/5 pointer-events-none"></div>
            <div className="absolute top-3 left-3 w-8 h-4 bg-white/40 rounded-sm"></div>
            <div className="absolute top-3 right-8 w-10 h-6 bg-white/40 rounded-sm"></div>
            <div className="absolute top-10 left-12 w-6 h-8 bg-transparent border border-white/40 rounded-sm"></div>
            <div className="absolute top-12 right-3 w-12 h-8 bg-white/40 rounded-sm"></div>
            <div className="absolute bottom-3 left-3 w-8 h-6 bg-white/40 rounded-sm"></div>
            <div className="absolute bottom-3 right-8 w-12 h-6 bg-white/40 rounded-sm"></div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 bg-black border border-white rounded-xl shadow-lg p-1">
            <button className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"><Grid className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"><Maximize2 className="w-4 h-4" /></button>
            <div className="w-px h-4 bg-white mx-1"></div>
            <button className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"><Minus className="w-4 h-4" /></button>
            <span className="text-xs font-medium px-2 text-white">100%</span>
            <button className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"><Plus className="w-4 h-4" /></button>
            <div className="w-px h-4 bg-white mx-1"></div>
            <button className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"><HelpCircle className="w-4 h-4" /></button>
          </div>
        </div>
      </main>
    </div>
  );
}

// Subcomponents
function ToolIcon({ icon, label, active = false }: { icon: React.ReactElement<{ className?: string }>; label: string; active?: boolean }) {
  return (
    <button className="flex flex-col items-center gap-1.5 group w-full px-2">
      <div className={`p-2.5 rounded-xl border transition-colors ${active ? 'bg-white text-black border-white' : 'text-white/70 border-transparent group-hover:text-white group-hover:bg-white/10'}`}>
        {React.cloneElement(icon, { className: 'w-5 h-5' })}
      </div>
      <span className={`text-[10px] ${active ? 'text-white' : 'text-white/50 group-hover:text-white/70'}`}>{label}</span>
    </button>
  );
}

function PageItem({ number, title, active = false }: { number: string; title: string; active?: boolean }) {
  return (
    <button className={`w-full text-left p-3 rounded-xl border transition-all ${active ? 'bg-white/10 border-white shadow-[0_0_0_1px_rgba(255,255,255,0.3)]' : 'bg-black border-white/50 hover:border-white'}`}>
      <div className="text-[10px] text-white/50 mb-2">{number}</div>
      <div className="h-16 mb-3 relative bg-black rounded border border-white overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '8px 8px' }}>
        {number === '1' && (
          <svg className="absolute inset-0 w-full h-full opacity-50 p-2" viewBox="0 0 100 50">
            <path d="M 10 40 Q 50 0 90 40" fill="none" stroke="white" strokeWidth="2" strokeDasharray="2,2" />
          </svg>
        )}
        {number === '2' && (
          <svg className="absolute inset-0 w-full h-full opacity-50 p-2" viewBox="0 0 100 50">
            <path d="M 50 25 L 80 15 M 50 25 L 80 35 M 50 25 L 20 25" fill="none" stroke="white" strokeWidth="2" />
          </svg>
        )}
      </div>
      <div className="text-xs font-medium text-white truncate">{title}</div>
    </button>
  );
}

function ToolbarBtn({ icon, active = false, onClick, highlight = false }: {
  icon: React.ReactElement<{ className?: string }>; active?: boolean; onClick?: () => void; highlight?: boolean;
}) {
  return (
    <button 
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors flex items-center justify-center border
        ${active && highlight ? 'bg-white text-black border-white shadow-inner' : 
          active ? 'bg-white/20 text-white border-white' : 
          'text-white/70 border-transparent hover:text-white hover:bg-white/10'}`}
    >
      {React.cloneElement(icon, { className: 'w-4 h-4' })}
    </button>
  );
}
