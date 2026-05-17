"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

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
        !!target.closest("button") ||
        !!target.closest('[role="button"]');
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

function HeroAnimation() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
      <motion.div
        className="absolute w-[600px] h-[600px] border-[0.5px] border-white/20 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute top-0 left-1/2 w-2 h-2 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-[1px]" />
      </motion.div>
      <motion.div
        className="absolute w-[800px] h-[800px] border-[0.5px] border-white/10 rounded-full border-dashed"
        animate={{ rotate: -360 }}
        transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function CanvasAnimation() {
  // Theme: boundless expansion — ripples + nested compass rings with orbital dots
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
      {/* Outer compass ring with 8 tick marks */}
      <motion.div
        className="absolute w-[640px] h-[640px] rounded-full border-[0.5px] border-white/15"
        animate={{ rotate: 360 }}
        transition={{ duration: 200, repeat: Infinity, ease: "linear" }}
      >
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <div key={deg} className="absolute inset-0" style={{ transform: `rotate(${deg}deg)` }}>
            <div className="absolute top-0 left-1/2 w-px h-4 bg-white/40 -translate-x-1/2" />
          </div>
        ))}
      </motion.div>

      {/* Mid ring with single glowing dot */}
      <motion.div
        className="absolute w-[420px] h-[420px] rounded-full border-[0.5px] border-white/30"
        animate={{ rotate: -360 }}
        transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute top-0 left-1/2 w-2 h-2 rounded-full bg-white -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
      </motion.div>

      {/* Inner ring with 2 opposing nodes */}
      <motion.div
        className="absolute w-[220px] h-[220px] rounded-full border-[0.5px] border-white/40"
        animate={{ rotate: 360 }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute top-0 left-1/2 w-1.5 h-1.5 rounded-full bg-white/70 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-1/2 w-1.5 h-1.5 rounded-full bg-white/70 -translate-x-1/2 translate-y-1/2" />
      </motion.div>

      {/* Innermost fast dashed ring */}
      <motion.div
        className="absolute w-[80px] h-[80px] rounded-full border-[0.5px] border-dashed border-white/50"
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />

      {/* Expanding ripple rings — the infinite canvas breathing */}
      {[0, 2.5, 5].map((delay, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-[0.5px] border-white"
          initial={{ width: 60, height: 60, opacity: 0.7 }}
          animate={{ width: [60, 700], height: [60, 700], opacity: [0.7, 0] }}
          transition={{ duration: 7.5, repeat: Infinity, delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function PagesAnimation() {
  // Theme: stacked pages fanned open — rings offset on X like a book splayed flat
  const pageRings = [
    { x: -90, size: 500, opacity: 0.12, speed: 210, dir:  1 },
    { x: -55, size: 490, opacity: 0.17, speed: 185, dir: -1 },
    { x: -22, size: 480, opacity: 0.24, speed: 165, dir:  1 },
    { x:   0, size: 468, opacity: 0.38, speed: 150, dir: -1 },
    { x:  22, size: 480, opacity: 0.24, speed: 165, dir:  1 },
    { x:  55, size: 490, opacity: 0.17, speed: 185, dir: -1 },
    { x:  90, size: 500, opacity: 0.12, speed: 210, dir:  1 },
  ];

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
      {/* Ruled lines — notebook paper texture */}
      <div className="absolute flex flex-col gap-9" style={{ opacity: 0.07 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-[480px] h-px bg-white" />
        ))}
      </div>

      {/* Vertical spine */}
      <div className="absolute w-px h-full bg-white/5" />

      {/* Fanned page rings */}
      {pageRings.map((ring, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: ring.size,
            height: ring.size,
            x: ring.x,
            border: `0.5px solid rgba(255,255,255,${ring.opacity})`,
          }}
          animate={{ rotate: ring.dir * 360 }}
          transition={{ duration: ring.speed, repeat: Infinity, ease: "linear" }}
        >
          {i === 3 && (
            <div className="absolute top-0 left-1/2 w-2 h-2 rounded-full bg-white/60 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
          )}
        </motion.div>
      ))}

      {/* Central binding hub */}
      <motion.div
        className="absolute w-[96px] h-[96px] rounded-full border-[0.5px] border-dashed border-white/40"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute w-10 h-10 rounded-full border-[0.5px] border-white/30" />
    </div>
  );
}

function BlocksAnimation() {
  // Theme: orrery — modular block-nodes orbiting a central hub at different speeds
  const orbits: { r: number; nodes: number; isSquare: boolean; speed: number; dir: number; nw: number }[] = [
    { r:  70, nodes: 1, isSquare: true,  speed: 18, dir:  1, nw: 7 },
    { r: 145, nodes: 4, isSquare: false, speed: 38, dir: -1, nw: 5 },
    { r: 230, nodes: 6, isSquare: false, speed: 62, dir:  1, nw: 4 },
    { r: 315, nodes: 3, isSquare: true,  speed: 88, dir: -1, nw: 6 },
  ];

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
      {/* Central hub — double concentric ring */}
      <div className="absolute w-6 h-6 rounded-full border border-white/70 flex items-center justify-center z-10">
        <div className="w-2 h-2 rounded-full bg-white/80" />
      </div>
      <motion.div
        className="absolute w-[34px] h-[34px] rounded-full border-[0.5px] border-dashed border-white/30"
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      {orbits.map((orbit, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-[0.5px] border-white/10"
          style={{ width: orbit.r * 2, height: orbit.r * 2 }}
          animate={{ rotate: orbit.dir * 360 }}
          transition={{ duration: orbit.speed, repeat: Infinity, ease: "linear" }}
        >
          {Array.from({ length: orbit.nodes }).map((_, j) => {
            const angle = (360 / orbit.nodes) * j;
            const rads = ((angle - 90) * Math.PI) / 180;
            const x = Math.cos(rads) * orbit.r + orbit.r - orbit.nw / 2;
            const y = Math.sin(rads) * orbit.r + orbit.r - orbit.nw / 2;
            return (
              <div
                key={j}
                className={`absolute border border-white/50 bg-black ${
                  orbit.isSquare ? "rounded-[1px]" : "rounded-full"
                }`}
                style={{ width: orbit.nw, height: orbit.nw, left: x, top: y }}
              />
            );
          })}
        </motion.div>
      ))}
    </div>
  );
}

function StylusAnimation() {
  // Theme: precision drawing — glowing stylus tip traces a ring; inner rings breathe like pen pressure
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
      {/* Outer boundary — the paper edge */}
      <div className="absolute w-[520px] h-[520px] rounded-full border-[0.5px] border-white/[0.12]" />

      {/* Slow dashed precision ring */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full border-[0.5px] border-dashed border-white/[0.18]"
        animate={{ rotate: -360 }}
        transition={{ duration: 130, repeat: Infinity, ease: "linear" }}
      />

      {/* Main tracing ring — stylus tip races around this */}
      <motion.div
        className="absolute w-[272px] h-[272px] rounded-full border-[0.5px] border-white/40"
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      >
        {/* Glowing stylus tip */}
        <div className="absolute top-0 left-1/2 w-3 h-3 rounded-full bg-white -translate-x-1/2 -translate-y-1/2 shadow-[0_0_16px_rgba(255,255,255,1),0_0_32px_rgba(255,255,255,0.5)]" />
        {/* Fading ink trail */}
        <div className="absolute top-0 left-1/2 w-px h-20 bg-linear-to-b from-white/80 to-transparent -translate-x-1/2" />
      </motion.div>

      {/* Pressure ring 1 — breathes slowly */}
      <motion.div
        className="absolute rounded-full border-[0.5px] border-white/[0.28]"
        animate={{ width: [145, 188, 145], height: [145, 188, 145] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Pressure ring 2 — breathes offset */}
      <motion.div
        className="absolute rounded-full border-[0.5px] border-white/[0.22]"
        animate={{ width: [80, 116, 80], height: [80, 116, 80] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      />

      {/* Center contact dot */}
      <div className="absolute w-2 h-2 rounded-full bg-white/70" />
    </div>
  );
}

const SECTIONS = {
  hero: {
    id: "hero",
    title: "Think without limits.",
    subtitle: "Organize ideas like a notebook",
    description:
      "Savant is the architectural canvas for learners. A space built for deep focus, structural intelligence, and visual cartography. Enter a realm where your thoughts command the architecture.",
    Animation: HeroAnimation,
  },
  canvas: {
    id: "canvas",
    title: "Infinite Canvas",
    subtitle: "Transcend physical boundaries",
    description:
      "The Infinite Notebook Canvas provides a boundless expanse where your thoughts can spread in all directions. It creates an ever-expanding cartography of your mind, free from the artificial constraints of traditional paper dimensions.",
    Animation: CanvasAnimation,
  },
  pages: {
    id: "pages",
    title: "Notebook Pages",
    subtitle: "Structured Freedom",
    description:
      "Choose the constraints that set your creativity free. Our Notebook-Style Pages offer dotted, ruled, or blank landscapes designed for perfect spatial harmony, bringing the familiar rhythm of physical journaling into the digital realm.",
    Animation: PagesAnimation,
  },
  blocks: {
    id: "blocks",
    title: "Powerful Blocks",
    subtitle: "Modular Intelligence",
    description:
      "Construct your knowledge architecture with interconnecting nodes. Move, resize, and link blocks of text, imagery, and complex equations to reflect how your brain naturally processes information and structural logic.",
    Animation: BlocksAnimation,
  },
  stylus: {
    id: "stylus",
    title: "Built for Stylus",
    subtitle: "Tactile Precision",
    description:
      "The Built for Stylus engine translates the visceral sensation of ink meeting paper into digital permanence. With imperceptible latency and algorithmic palm rejection, it captures the exact nuance of your handwritten thought.",
    Animation: StylusAnimation,
  },
} as const;

const BOOKMARKS = [
  { id: "canvas", label: "Infinite Notebook Canvas" },
  { id: "pages", label: "Notebook-Style Pages" },
  { id: "blocks", label: "Powerful Note Blocks" },
  { id: "stylus", label: "Built for Stylus" },
] as const;

export default function LandingPage() {
  const [activeSection, setActiveSection] =
    useState<keyof typeof SECTIONS>("hero");
  const currentData = SECTIONS[activeSection];
  const AnimationComponent = currentData.Animation;

  return (
    <div className="min-h-screen bg-black text-white cursor-none font-serif selection:bg-white/30 overflow-hidden flex flex-col relative select-none">
      <CustomCursor />

      {/* Header */}
      <header className="px-16 py-12 flex items-center justify-between relative z-50 flex-shrink-0">
        <div
          className="flex items-center gap-6 group cursor-none"
          role="button"
          onClick={() => setActiveSection("hero")}
        >
          <div className="relative w-12 h-12 flex items-center justify-center">
            <motion.div
              className="absolute inset-0 border-[0.5px] border-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            />
            <span className="text-[10px] uppercase tracking-widest text-white">
              IB
            </span>
          </div>
          <span className="text-xl italic tracking-[0.2em] uppercase text-white font-light">
            Savant
          </span>
        </div>

        <div className="flex items-center gap-12">
          <Link
            href="/figma-dashboard"
            className="text-[10px] uppercase tracking-[0.3em] text-white/50 hover:text-white transition-colors cursor-none relative group"
          >
            Dashboard
            <div className="absolute -bottom-2 left-0 w-0 h-[1px] bg-white group-hover:w-full transition-all duration-500" />
          </Link>
          <Link
            href="/figma-dashboard"
            className="text-[10px] uppercase tracking-[0.3em] text-white/50 hover:text-white transition-colors cursor-none relative group"
          >
            Canvas
            <div className="absolute -bottom-2 left-0 w-0 h-[1px] bg-white group-hover:w-full transition-all duration-500" />
          </Link>
          <Link
            href="/onboarding"
            className="text-[10px] uppercase tracking-[0.3em] text-white/50 hover:text-white transition-colors cursor-none relative group"
          >
            Log in
            <div className="absolute -bottom-2 left-0 w-0 h-[1px] bg-white group-hover:w-full transition-all duration-500" />
          </Link>
          <Link
            href="/onboarding"
            className="text-[10px] uppercase tracking-[0.3em] border border-white px-8 py-3 hover:bg-white hover:text-black transition-colors cursor-none"
          >
            Start Free
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-16 relative z-10">
        <div className="relative w-full max-w-[1200px] h-[70vh] border-[0.5px] border-white/20 bg-black/40 backdrop-blur-sm flex">
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Bookmarks */}
          <div className="absolute -right-[60px] top-12 flex flex-col gap-2 z-50">
            {BOOKMARKS.map((bookmark) => {
              const isActive = activeSection === bookmark.id;
              return (
                <div
                  key={bookmark.id}
                  role="button"
                  onClick={() =>
                    setActiveSection(isActive ? "hero" : bookmark.id)
                  }
                  className={`w-[60px] h-40 border-[0.5px] border-l-0 flex items-center justify-center cursor-none transition-all duration-500 ${
                    isActive
                      ? "bg-white border-white text-black -translate-x-[1px]"
                      : "bg-black border-white/20 text-white/40 hover:bg-white/5 hover:border-white/40"
                  }`}
                >
                  <span
                    className="text-[9px] uppercase tracking-[0.3em] whitespace-nowrap rotate-180"
                    style={{ writingMode: "vertical-rl" }}
                  >
                    {bookmark.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Dynamic Content */}
          <div className="relative w-full h-full overflow-hidden flex items-center justify-center p-24 z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={`anim-${activeSection}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="absolute inset-0 z-0"
              >
                <AnimationComponent />
              </motion.div>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={`text-${activeSection}`}
                initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-2xl text-center flex flex-col items-center"
              >
                <div className="text-[10px] uppercase tracking-[0.5em] text-white/40 mb-12 flex items-center gap-4">
                  <div className="w-12 h-[1px] bg-white/20" />
                  {currentData.subtitle}
                  <div className="w-12 h-[1px] bg-white/20" />
                </div>

                <h1 className="text-6xl md:text-8xl italic font-light text-white mb-12 leading-[1.1] tracking-wide">
                  {currentData.title}
                </h1>

                <p className="text-lg text-white/60 leading-relaxed font-light tracking-wide max-w-xl">
                  {currentData.description}
                </p>

                {activeSection === "hero" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 1 }}
                    className="mt-16"
                  >
                    <span className="text-[9px] uppercase tracking-[0.4em] text-white/30 italic">
                      Select a bookmark to explore
                    </span>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-8 flex justify-between items-center relative z-10 text-[9px] uppercase tracking-[0.3em] text-white/30 border-t border-white/5">
        <div>© 2026 Savant Architecture</div>
        <div className="flex gap-8">
          <span className="hover:text-white transition-colors cursor-none">
            Privacy
          </span>
          <span className="hover:text-white transition-colors cursor-none">
            Terms
          </span>
        </div>
      </footer>
    </div>
  );
}
