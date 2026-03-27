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

import { useRef, useCallback } from "react";
import getStroke from "perfect-freehand";
import { useCanvasStore } from "@/store/canvas-store";

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
  const {
    activeTool,
    strokes,
    activePoints,
    beginStroke,
    extendStroke,
    commitStroke,
    eraseNear,
    viewport,
    rfContainerOrigin,
  } = useCanvasStore();

  const isDrawing = useRef(false);
  const isPen = activeTool === "pen";
  const isEraser = activeTool === "eraser";
  const isActive = isPen || isEraser;

  const { x: vx, y: vy, zoom: vz } = viewport;
  const { x: ox, y: oy } = rfContainerOrigin;

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
      } else {
        eraseNear(cx, cy, 20 / vz);
      }
    },
    [isActive, isPen, beginStroke, eraseNear, toCanvas, vz]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isDrawing.current || !isActive) return;
      const p = e.pressure > 0 ? e.pressure : 0.5;
      const { cx, cy } = toCanvas(e.clientX, e.clientY);
      if (isPen) {
        extendStroke(cx, cy, p);
      } else {
        eraseNear(cx, cy, 20 / vz);
      }
    },
    [isActive, isPen, extendStroke, eraseNear, toCanvas, vz]
  );

  const onPointerUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (isPen) commitStroke();
  }, [isPen, commitStroke]);

  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{
        zIndex: 30,
        pointerEvents: isActive ? "all" : "none",
        cursor: isPen ? "crosshair" : isEraser ? "cell" : "default",
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
        {/* Committed strokes */}
        {strokes.map((stroke) => {
          const outline = getStroke(stroke.points, STROKE_OPTIONS);
          const d = outlineToPath(outline);
          if (!d) return null;
          return (
            <path
              key={stroke.id}
              d={d}
              fill="rgba(255,255,255,0.82)"
              style={{
                filter:
                  "drop-shadow(0 0 2px rgba(255,255,255,0.45)) drop-shadow(0 0 6px rgba(255,255,255,0.15))",
              }}
            />
          );
        })}

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
    </svg>
  );
}
