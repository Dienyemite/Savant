/**
 * CanvasToolbar.tsx — Floating drawing tool palette
 *
 * Shows at the bottom-center of the screen. Tools:
 *   V  Select  — default pointer, no drawing
 *   P  Pen     — freehand ink (perfect-freehand)
 *   E  Eraser  — proximity-based stroke removal
 *   T  Text    — click canvas to spawn a text note
 *
 * Keyboard shortcuts: V, P, E, T
 */

"use client";

import { useEffect } from "react";
import { useCanvasStore, CanvasTool } from "@/store/canvas-store";
import { MousePointer2, Pen, Eraser, Highlighter, Type } from "lucide-react";

const TOOLS: {
  id: CanvasTool;
  label: string;
  shortcut: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "select",    label: "Select",    shortcut: "V", Icon: MousePointer2 },
  { id: "pen",       label: "Pen",       shortcut: "P", Icon: Pen },
  { id: "eraser",    label: "Eraser",    shortcut: "E", Icon: Eraser },
  { id: "highlight", label: "Highlight", shortcut: "H", Icon: Highlighter },
  { id: "text",      label: "Text",      shortcut: "T", Icon: Type },
];

export default function CanvasToolbar() {
  const { activeTool, setActiveTool } = useCanvasStore();

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when user is typing in an input / textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const match = TOOLS.find(
        (t) => t.shortcut === e.key.toUpperCase()
      );
      if (match) setActiveTool(match.id);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setActiveTool]);

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-px"
      style={{ fontFamily: "'Courier New', monospace" }}
    >
      <div className="flex items-center gap-px border border-white/[0.08] bg-black/90 px-1.5 py-1.5">
        {TOOLS.map(({ id, label, shortcut, Icon }) => {
          const isActive = activeTool === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTool(id)}
              title={`${label}  (${shortcut})`}
              className={`
                flex flex-col items-center gap-0.5 w-10 h-10 justify-center
                transition-all duration-150
                ${
                  isActive
                    ? "bg-white/10 text-white text-glow-subtle"
                    : "text-white/25 hover:text-white/55 hover:bg-white/[0.04]"
                }
              `}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[8px] tracking-wider uppercase opacity-60">
                {shortcut}
              </span>
            </button>
          );
        })}

        {/* Divider */}
        <div className="w-px h-5 bg-white/10 mx-1.5" />

        {/* Tool label */}
        <span className="text-[9px] tracking-widest uppercase text-white/20 w-12 text-center">
          {TOOLS.find((t) => t.id === activeTool)?.label}
        </span>
      </div>
    </div>
  );
}
