"use client";

import Link from "next/link";
import { PenTool, Keyboard, Eye, Layers, ChevronDown, CheckCircle2 } from "lucide-react";

// ════════════════════════════════════════════════════════════
// Landing — Marketing entry point.
// Black background, dot-grid, strict monochrome.
// ════════════════════════════════════════════════════════════

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-black">
      {/* Background dot pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-8 py-5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center text-black font-bold border border-white">
            <span className="opacity-90 text-sm">IB</span>
          </div>
          <span className="text-xl font-medium tracking-tight text-white">Savant</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
          <a href="#features" className="hover:text-white transition-colors">
            Features
          </a>
          <Link href="/dashboard" className="hover:text-white transition-colors">
            Pages
          </Link>
          <Link href="/learn" className="flex items-center gap-1 hover:text-white transition-colors">
            <span>Learn</span>
            <ChevronDown className="w-4 h-4" />
          </Link>
          <a href="#pricing" className="hover:text-white transition-colors">
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-6 text-sm font-medium">
          <Link
            href="/onboarding"
            className="text-white/70 hover:text-white transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/onboarding"
            className="bg-white hover:bg-gray-200 text-black px-5 py-2.5 rounded-md transition-colors border border-white"
          >
            Start free
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-8 pt-16 pb-24 grid lg:grid-cols-2 gap-16 items-center relative z-10">
        {/* Left column */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-6xl font-bold leading-[1.1] text-white tracking-tight">
              Organize ideas
              <br />
              like a notebook.
              <br />
              <span className="text-white font-normal text-7xl inline-block -rotate-2 mt-2 italic">
                Think without limits.
              </span>
            </h1>
            <p className="text-white/70 text-lg max-w-md leading-relaxed">
              Savant is the Miro-style canvas for learners.
              <br />
              Write with a stylus, type with ease, and connect
              <br />
              ideas across pages. Built for deep focus and
              <br />
              visual thinking.
            </p>
          </div>

          <div className="space-y-6 pt-4">
            <FeatureRow
              icon={<PenTool className="w-5 h-5 text-white" />}
              title="Natural stylus writing"
              desc="Smooth, low-latency ink on premium paper."
            />
            <FeatureRow
              icon={<Keyboard className="w-5 h-5 text-white" />}
              title="Typed notes & rich content"
              desc="Text, equations, images, code, and more."
            />
            <FeatureRow
              icon={<Eye className="w-5 h-5 text-white" />}
              title="Visual learning"
              desc="Diagrams, mind maps, and concept flows."
            />
            <FeatureRow
              icon={<Layers className="w-5 h-5 text-white" />}
              title="Page-based organization"
              desc="Notebooks, sections, and infinite canvas."
            />
          </div>

          <div className="flex items-center gap-4 pt-6">
            <Link
              href="/onboarding"
              className="bg-white hover:bg-gray-200 text-black px-6 py-3 rounded-md transition-colors font-medium flex items-center gap-2 border border-white"
            >
              Start free
              <span className="text-lg leading-none">→</span>
            </Link>
            <Link
              href="/learn"
              className="px-6 py-3 rounded-md font-medium text-white border border-white hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <span className="flex items-center justify-center w-5 h-5 rounded-full border border-white text-[10px]">
                ▶
              </span>
              Try the app
            </Link>
          </div>

          <div className="flex items-center gap-2 text-xs text-white/70">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>No credit card required • Free plan available</span>
          </div>
        </div>

        {/* Right column — mockup window */}
        <div className="relative">
          <div className="absolute inset-0 bg-white/10 blur-3xl rounded-full -z-10" />
          <div className="bg-black border border-white rounded-2xl shadow-2xl overflow-hidden aspect-4/3 flex flex-col relative">
            {/* Window chrome */}
            <div className="h-12 border-b border-white flex items-center px-4 justify-between bg-black">
              <div className="flex items-center gap-2 text-xs text-white/70">
                <div className="flex gap-1.5 mr-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                </div>
                <span>Physics 201</span>
                <span>/</span>
                <span className="text-white">Mechanics</span>
                <ChevronDown className="w-3 h-3" />
              </div>
              <div className="bg-white/10 border border-white rounded px-3 py-1 text-xs text-white">
                Share
              </div>
            </div>

            {/* Window body */}
            <div
              className="flex-1 relative bg-black"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)",
                backgroundSize: "20px 20px",
              }}
            >
              <div className="absolute top-8 left-8">
                <h2 className="text-white text-4xl mb-4 italic">
                  Projectile Motion
                </h2>
                <div className="text-white/70 text-xl leading-relaxed italic">
                  Given:
                  <br />
                  <span className="text-sm">v₀ = initial velocity</span>
                  <br />
                  <span className="text-sm">θ = launch angle</span>
                  <br />
                  <span className="text-sm">g = 9.81 m/s²</span>
                </div>
              </div>

              {/* Parabola sketch */}
              <div className="absolute top-20 right-16 w-48 h-28 border-l border-b border-white">
                <svg
                  className="absolute inset-0 w-full h-full overflow-visible"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 0 100 Q 50 -20 100 100"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                  />
                  <line x1="0" y1="100" x2="30" y2="40" stroke="white" strokeWidth="1.5" />
                  <polygon points="30,40 28,45 32,44" fill="white" />
                </svg>
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/60">
                  Range (R)
                </div>
              </div>

              {/* Sticky note */}
              <div className="absolute bottom-6 right-6 w-44 bg-black border border-white rounded-lg p-3 shadow-xl">
                <h3 className="text-white text-lg mb-1.5 italic">Notes</h3>
                <ul className="text-[11px] text-white/60 space-y-1.5 list-disc pl-3 italic">
                  <li>Max height at v<sub>y</sub> = 0</li>
                  <li>Path is a parabola</li>
                  <li>Neglect air resistance</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Feature grid ── */}
      <section
        id="features"
        className="bg-black py-20 px-8 relative z-10 border-t border-white/20"
      >
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center text-2xl font-medium mb-12 text-white">
            Everything you need to learn and create
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard
              title="Infinite Notebook Canvas"
              desc="Think big. Drag, zoom, and connect ideas across infinite space."
              visual={
                <div className="flex items-center justify-center h-full text-white/40 text-6xl">
                  ∞
                </div>
              }
            />
            <FeatureCard
              title="Notebook-Style Pages"
              desc="Choose dotted, ruled, or blank pages. Organized like your favorite notebook."
              visual={
                <div className="flex gap-2 h-full items-center justify-center">
                  <div className="w-12 h-16 border border-white rounded bg-black flex flex-col justify-evenly px-2">
                    <div className="h-0.5 bg-white w-full" />
                    <div className="h-0.5 bg-white w-full" />
                    <div className="h-0.5 bg-white w-full" />
                  </div>
                  <div className="w-12 h-16 border border-white/40 rounded bg-black" />
                </div>
              }
            />
            <FeatureCard
              title="Knowledge Constellation"
              desc="Visual concept map showing how ideas connect. Built for deep learning."
              visual={
                <div className="flex items-center justify-center h-full relative">
                  <div className="w-3 h-3 rounded-full bg-white absolute top-4 left-8" />
                  <div className="w-2 h-2 rounded-full bg-white/60 absolute top-8 right-8" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/80 absolute bottom-6 left-12" />
                  <svg className="absolute inset-0 w-full h-full opacity-30" aria-hidden>
                    <line x1="40" y1="20" x2="80%" y2="40%" stroke="white" strokeWidth="1" />
                    <line x1="40" y1="20" x2="30%" y2="80%" stroke="white" strokeWidth="1" />
                  </svg>
                </div>
              }
            />
            <FeatureCard
              title="Socratic AI Tutor"
              desc="Ask questions, get guided answers. Your AI study partner never just gives it away."
              visual={
                <div className="flex items-center justify-center h-full">
                  <svg width="80" height="40" viewBox="0 0 80 40" fill="none" aria-hidden>
                    <path
                      d="M5 20 Q 25 5, 40 20 T 75 20"
                      stroke="white"
                      strokeWidth="1.5"
                      fill="none"
                    />
                  </svg>
                </div>
              }
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureRow({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-1">{icon}</div>
      <div>
        <h3 className="text-white font-medium mb-0.5">{title}</h3>
        <p className="text-white/50 text-sm">{desc}</p>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  desc,
  visual,
}: {
  title: string;
  desc: string;
  visual: React.ReactNode;
}) {
  return (
    <div className="bg-black border border-white/20 rounded-xl p-6 flex flex-col hover:border-white/50 transition-colors">
      <div className="h-32 mb-4 bg-black rounded-lg border border-white/20 overflow-hidden">
        {visual}
      </div>
      <h3 className="text-white font-medium mb-2">{title}</h3>
      <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
