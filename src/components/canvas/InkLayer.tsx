/**
 * InkLayer.tsx — Full-screen SVG freehand drawing overlay
 *
 * Phase 3: "Stylus Support — Implement perfect-freehand within the
 * canvas engine. Capture pointer events to allow users to draw glowing
 * white ink anywhere. Ensure strokes are saved to the local canvas state."
 *
 * Layer renders above all canvas content (z-30) but below lesson modal.
 * When activeTool is "select", pointer events pass through transparently.
 * Supports mouse, touch, and pressure-sensitive stylus via Pointer Events API.
 */

"use client";

import { useRef, useCallback, useMemo } from "react";
import getStroke from "perfect-freehand";
import { useCanvasStore } from "@/store/canvas-store";
import { supabaseBrowser } from "@/lib/supabase";

// ─────────────────────────────────────────────
// perfect-freehand config — matches gel ink on
// matte black paper (Image 1 reference)
// ─────────────────────────────────────────────

const STROKE_OPTIONS = {
  size: 3,
  thinning: 0.5,
  smoothing: 0.6,
  streamline: 0.5,
  simulatePressure: false, // we pass real pressure from pointer events
};

const HIGHLIGHT_OPTIONS = {
  size: 18,
  thinning: 0.0,    // flat width — no pressure taper
  smoothing: 0.8,
  streamline: 0.4,
  simulatePressure: false,
};

/** Convert perfect-freehand outline points to a smooth SVG path. */
function outlineToPath(outline: number[][]): string {
  if (outline.length < 4) return "";
  const d: string[] = [];
  const [x0, y0] = outline[0];
  d.push(`M ${x0.toFixed(1)} ${y0.toFixed(1)}`);
  for (let i = 1; i < outline.length - 1; i++) {
    const cx = ((outline[i][0] + outline[i + 1][0]) / 2).toFixed(1);
    const cy = ((outline[i][1] + outline[i + 1][1]) / 2).toFixed(1);
    d.push(
      `Q ${outline[i][0].toFixed(1)} ${outline[i][1].toFixed(1)} ${cx} ${cy}`
    );
  }
  d.push("Z");
  return d.join(" ");
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function InkLayer() {
  // Granular selectors — each selector subscribes only to its own slice,
  // preventing re-renders of the entire component on unrelated store changes.
  const activeTool = useCanvasStore((s) => s.activeTool);
  const strokes = useCanvasStore((s) => s.strokes);
  const activePoints = useCanvasStore((s) => s.activePoints);
  const beginStroke = useCanvasStore((s) => s.beginStroke);
  const extendStroke = useCanvasStore((s) => s.extendStroke);
  const commitStroke = useCanvasStore((s) => s.commitStroke);
  const eraseNear = useCanvasStore((s) => s.eraseNear);
  const highlightStrokes = useCanvasStore((s) => s.highlightStrokes);
  const activeHighlightPoints = useCanvasStore((s) => s.activeHighlightPoints);
  const beginHighlight = useCanvasStore((s) => s.beginHighlight);
  const extendHighlight = useCanvasStore((s) => s.extendHighlight);
  const commitHighlight = useCanvasStore((s) => s.commitHighlight);
  const viewport = useCanvasStore((s) => s.viewport);
  const rfContainerOrigin = useCanvasStore((s) => s.rfContainerOrigin);

  const isDrawing = useRef(false);
  const isPen = activeTool === "pen";
  const isEraser = activeTool === "eraser";
  const isHighlight = activeTool === "highlight";
  const isActive = isPen || isEraser || isHighlight;

  // Debounced canvas save — 500ms after last stroke commit
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!data.session) return;
      const { strokes, textNotes } = useCanvasStore.getState();
      fetch("/api/canvas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strokes, textNotes }),
      }).catch(() => {/* silent */});
    }, 500);
  }, []);

  const { x: vx, y: vy, zoom: vz } = viewport;
  const { x: ox, y: oy } = rfContainerOrigin;

  // Memoize committed stroke paths — only recomputes when strokes[] changes,
  // NOT on every active-stroke pointer move event.
  const committedInkPaths = useMemo(
    () =>
      strokes.map((stroke) => ({
        id: stroke.id,
        d: outlineToPath(getStroke(stroke.points, STROKE_OPTIONS)),
      })),
    [strokes]
  );

  const committedHighlightPaths = useMemo(
    () =>
      highlightStrokes.map((stroke) => ({
        id: stroke.id,
        d: outlineToPath(getStroke(stroke.points, HIGHLIGHT_OPTIONS)),
        opacity: (stroke as { opacity?: number }).opacity ?? 0.22,
      })),
    [highlightStrokes]
  );

  /** Convert a screen-space pointer position to canvas space. */
  const toCanvas = useCallback(
    (clientX: number, clientY: number) => ({
      cx: (clientX - ox - vx) / vz,
      cy: (clientY - oy - vy) / vz,
    }),
    [ox, oy, vx, vy, vz]
  );

  // ── Pointer handlers ──

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isActive) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      isDrawing.current = true;
      const p = e.pressure > 0 ? e.pressure : 0.5;
      const { cx, cy } = toCanvas(e.clientX, e.clientY);
      if (isPen) {
        beginStroke(cx, cy, p);
      } else if (isHighlight) {
        beginHighlight(cx, cy, p);
      } else {
        eraseNear(cx, cy, 20 / vz);
      }
    },
    [isActive, isPen, isHighlight, beginStroke, beginHighlight, eraseNear, toCanvas, vz]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isDrawing.current || !isActive) return;
      const p = e.pressure > 0 ? e.pressure : 0.5;
      const { cx, cy } = toCanvas(e.clientX, e.clientY);
      if (isPen) {
        extendStroke(cx, cy, p);
      } else if (isHighlight) {
        extendHighlight(cx, cy, p);
      } else {
        eraseNear(cx, cy, 20 / vz);
      }
    },
    [isActive, isPen, isHighlight, extendStroke, extendHighlight, eraseNear, toCanvas, vz]
  );

  const onPointerUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (isPen) {
      if (process.env.NODE_ENV !== "production") {
        performance.mark("stroke-start");
        commitStroke();
        performance.mark("stroke-end");
        performance.measure("stroke-commit", "stroke-start", "stroke-end");
        const entry = performance.getEntriesByName("stroke-commit").at(-1);
        if (entry && entry.duration > 16) {
          console.warn(`Slow stroke commit: ${entry.duration.toFixed(1)}ms`);
        }
      } else {
        commitStroke();
      }
      scheduleSave();
    }
    else if (isHighlight) { commitHighlight(); scheduleSave(); }
  }, [isPen, isHighlight, commitStroke, commitHighlight, scheduleSave]);

  return (
    <svg
      role="region"
      aria-label="Drawing canvas"
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{
        zIndex: 30,
        pointerEvents: isActive ? "all" : "none",
        cursor: isPen ? "crosshair" : isEraser ? "cell" : isHighlight ? "crosshair" : "default",
        overflow: "visible",
        touchAction: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/*
        All paths are stored in canvas space.
        This <g> applies the same transform ReactFlow uses so they
        stay pinned to the paper when the user pans or zooms.
      */}
      <g transform={`translate(${ox + vx}, ${oy + vy}) scale(${vz})`}>
        {/* ── Committed layer — static, only rerenders when strokes[] changes ── */}
        <g id="committed">
          {/* Committed highlight strokes */}
          {committedHighlightPaths.map(({ id, d, opacity }) =>
            d ? (
              <path
                key={id}
                d={d}
                fill={`rgba(255,255,255,${opacity})`}
                style={{ mixBlendMode: "screen" }}
              />
            ) : null
          )}

          {/* Committed ink strokes */}
          {committedInkPaths.map(({ id, d }) =>
            d ? (
              <path
                key={id}
                d={d}
                fill="rgba(255,255,255,0.82)"
                style={{
                  filter:
                    "drop-shadow(0 0 2px rgba(255,255,255,0.45)) drop-shadow(0 0 6px rgba(255,255,255,0.15))",
                }}
              />
            ) : null
          )}
        </g>

        {/* ── Active layer — rerenders on every pointer move during drawing ── */}
        <g id="active">
          {/* Active highlight being drawn */}
          {isHighlight && activeHighlightPoints.length > 1 && (() => {
            const outline = getStroke(activeHighlightPoints, HIGHLIGHT_OPTIONS);
            const d = outlineToPath(outline);
            if (!d) return null;
            return (
              <path
                d={d}
                fill="rgba(255,255,255,0.22)"
                style={{ mixBlendMode: "screen" }}
              />
            );
          })()}

          {/* Active stroke (currently being drawn) */}
          {activePoints.length > 1 && (() => {
            const outline = getStroke(activePoints, STROKE_OPTIONS);
            const d = outlineToPath(outline);
            if (!d) return null;
            return (
              <path
                d={d}
                fill="rgba(255,255,255,0.9)"
                style={{
                  filter:
                    "drop-shadow(0 0 3px rgba(255,255,255,0.6)) drop-shadow(0 0 8px rgba(255,255,255,0.2))",
                }}
              />
            );
          })()}
        </g>
      </g>
    </svg>
  );
}
