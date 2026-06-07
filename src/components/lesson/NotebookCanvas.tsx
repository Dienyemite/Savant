"use client";
/* eslint-disable react-hooks/refs */

/**
 * NotebookCanvas — The interactive drawing layer.
 *
 * Placed as an absolute overlay on top of lesson content.
 * Handles mouse, touch, and stylus (pen) input via the
 * Pointer Events API. Uses perfect-freehand for smooth,
 * pressure-sensitive ink paths rendered onto an SVG layer.
 *
 * Tools:
 *   • pen    — draw freehand strokes
 *   • eraser — erase strokes by proximity
 *   • text   — click anywhere to type a floating note
 *
 * Serialization:
 *   The full canvas state (strokes + text nodes) is returned
 *   via the onSave callback as a JSON string for persistence.
 */

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { motion } from "framer-motion";
import getStroke from "perfect-freehand";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface InputPoint {
  x: number;
  y: number;
  pressure: number;
}

interface Stroke {
  id: string;
  points: InputPoint[];
  size: number;
}

interface TextNode {
  id: string;
  x: number;
  y: number;
  text: string;
}

export interface CanvasState {
  strokes: Stroke[];
  textNodes: TextNode[];
}

export interface NotebookCanvasHandle {
  getState: () => CanvasState;
  loadState: (state: CanvasState) => void;
  clear: () => void;
}

type Tool = "pen" | "eraser" | "text" | "highlight";

interface NotebookCanvasProps {
  initialState?: CanvasState;
  onSave?: (state: CanvasState) => void;
  className?: string;
  /** Ref to the scrollable lesson content container. When provided,
   *  stroke Y coordinates are stored relative to scrollTop so annotations
   *  stay pinned to the content position across scrolling. */
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  /**
   * Called when a highlight stroke is committed. Provides the screen-space
   * bounding rect of the stroke — used by Smart Annotation (Sprint 5.3)
   * to query which lesson text blocks are covered.
   */
  onHighlightComplete?: (rect: DOMRect) => void;
}

// ─────────────────────────────────────────────
// perfect-freehand → SVG path
// ─────────────────────────────────────────────

function getSvgPathFromStrokePoints(points: number[][]): string {
  if (points.length < 4) {
    const [x, y] = points[0] ?? [0, 0];
    return `M ${x} ${y}`;
  }

  const d: string[] = [];
  const [x0, y0] = points[0];
  d.push(`M ${x0.toFixed(2)} ${y0.toFixed(2)}`);

  for (let i = 1; i < points.length - 1; i++) {
    const mx = ((points[i][0] + points[i + 1][0]) / 2).toFixed(2);
    const my = ((points[i][1] + points[i + 1][1]) / 2).toFixed(2);
    d.push(`Q ${points[i][0].toFixed(2)} ${points[i][1].toFixed(2)} ${mx} ${my}`);
  }

  d.push("Z");
  return d.join(" ");
}

function strokeToPath(stroke: Stroke): string {
  const outlinePoints = getStroke(
    stroke.points.map((p) => [p.x, p.y, p.pressure]),
    {
      size: stroke.size,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: false,
    }
  );
  return getSvgPathFromStrokePoints(outlinePoints);
}

// ─────────────────────────────────────────────
// perfect-freehand config
// ─────────────────────────────────────────────

const HIGHLIGHT_OPTIONS = {
  size: 18,
  thinning: 0.0,
  smoothing: 0.8,
  streamline: 0.4,
  simulatePressure: false,
};

// ─────────────────────────────────────────────
// Eraser tolerance (pixels)
// ─────────────────────────────────────────────
const ERASER_RADIUS = 18;

function isStrokeNearPoint(stroke: Stroke, ex: number, ey: number): boolean {
  return stroke.points.some(
    (p) => Math.hypot(p.x - ex, p.y - ey) < ERASER_RADIUS
  );
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

const NotebookCanvas = forwardRef<NotebookCanvasHandle, NotebookCanvasProps>(
  function NotebookCanvas({ initialState, onSave, className = "", scrollRef, onHighlightComplete }, ref) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [tool, setTool] = useState<Tool>("pen");
    const [strokes, setStrokes] = useState<Stroke[]>(
      initialState?.strokes ?? []
    );
    const [textNodes, setTextNodes] = useState<TextNode[]>(
      initialState?.textNodes ?? []
    );
    const [activeStroke, setActiveStroke] = useState<Stroke | null>(null);
    const [activeHighlightStroke, setActiveHighlightStroke] = useState<Stroke | null>(null);
    const [highlightStrokes, setHighlightStrokes] = useState<Stroke[]>([]);
    const [pulsingHighlightId, setPulsingHighlightId] = useState<string | null>(null);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [visible, setVisible] = useState(false);

    // Show canvas controls only after first pointer move
    const [hasContent, setHasContent] = useState(
      (initialState?.strokes.length ?? 0) > 0 ||
        (initialState?.textNodes.length ?? 0) > 0
    );

    // Expose handle to parent
    useImperativeHandle(ref, () => ({
      getState: () => ({ strokes, textNodes }),
      loadState: (state) => {
        setStrokes(state.strokes);
        setTextNodes(state.textNodes);
      },
      clear: () => {
        setStrokes([]);
        setTextNodes([]);
        setHighlightStrokes([]);
        setHasContent(false);
      },
    }));

    // ── Pointer event helpers ──
    const getRelativePoint = useCallback(
      (e: PointerEvent): InputPoint => {
        const svg = svgRef.current;
        if (!svg) return { x: 0, y: 0, pressure: 0.5 };
        const rect = svg.getBoundingClientRect();
        const scrollY = scrollRef?.current?.scrollTop ?? 0;
        return {
          x: e.clientX - rect.left,
          // Store Y relative to content scroll position so strokes
          // remain anchored to content as the user scrolls.
          y: e.clientY - rect.top + scrollY,
          pressure: e.pressure > 0 ? e.pressure : 0.5,
        };
      },
      [scrollRef]
    );

    // ── Pointer Down ──
    const handlePointerDown = useCallback(
      (e: PointerEvent) => {
        if (tool === "text") return; // handled by click
        e.preventDefault();
        (e.target as SVGElement).setPointerCapture(e.pointerId);
        const pt = getRelativePoint(e);

        if (tool === "pen") {
          const newStroke: Stroke = {
            id: crypto.randomUUID(),
            points: [pt],
            size: e.pointerType === "pen" ? 3 : 2.5,
          };
          setActiveStroke(newStroke);
          setHasContent(true);
          setVisible(true);
        } else if (tool === "highlight") {
          const newHighlight: Stroke = {
            id: crypto.randomUUID(),
            points: [pt],
            size: 18,
          };
          setActiveHighlightStroke(newHighlight);
          setHasContent(true);
          setVisible(true);
        } else if (tool === "eraser") {
          setStrokes((prev) =>
            prev.filter((s) => !isStrokeNearPoint(s, pt.x, pt.y))
          );
        }
      },
      [tool, getRelativePoint]
    );

    // ── Pointer Move ──
    const handlePointerMove = useCallback(
      (e: PointerEvent) => {
        if (tool === "eraser") {
          e.preventDefault();
          const pt = getRelativePoint(e);
          setStrokes((prev) =>
            prev.filter((s) => !isStrokeNearPoint(s, pt.x, pt.y))
          );
          return;
        }
        const pt = getRelativePoint(e);
        if (tool === "highlight" && activeHighlightStroke) {
          e.preventDefault();
          setActiveHighlightStroke((prev) =>
            prev ? { ...prev, points: [...prev.points, pt] } : null
          );
          return;
        }
        if (!activeStroke) return;
        e.preventDefault();
        setActiveStroke((prev) =>
          prev ? { ...prev, points: [...prev.points, pt] } : null
        );
      },
      [tool, activeStroke, activeHighlightStroke, getRelativePoint]
    );

    // ── Pointer Up ──
    const handlePointerUp = useCallback(() => {
      // Commit regular stroke
      if (activeStroke && activeStroke.points.length > 1) {
        setStrokes((prev) => [...prev, activeStroke]);
        onSave?.({ strokes: [...strokes, activeStroke], textNodes });
      }
      setActiveStroke(null);

      // Commit highlight stroke
      if (activeHighlightStroke && activeHighlightStroke.points.length > 1) {
        setHighlightStrokes((prev) => [...prev, activeHighlightStroke]);
        setPulsingHighlightId(activeHighlightStroke.id);
        // Clear pulse after 600ms per spec
        setTimeout(() => setPulsingHighlightId(null), 600);

        // Compute screen-space bounding rect for Smart Annotation hit-test
        if (onHighlightComplete && svgRef.current) {
          const svgRect = svgRef.current.getBoundingClientRect();
          const scrollY = scrollRef?.current?.scrollTop ?? 0;
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const p of activeHighlightStroke.points) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
          }
          // points are SVG-relative; Y is content-relative (includes scrollY)
          // convert back to screen-space (viewport coordinates)
          const screenRect = new DOMRect(
            minX + svgRect.left,
            minY - scrollY + svgRect.top,
            maxX - minX,
            maxY - minY
          );
          onHighlightComplete(screenRect);
        }
      }
      setActiveHighlightStroke(null);
    }, [activeStroke, activeHighlightStroke, strokes, textNodes, onSave, onHighlightComplete, scrollRef]);

    // ── Click for text nodes ──
    const handleClick = useCallback(
      (e: React.MouseEvent<SVGSVGElement>) => {
        if (tool !== "text") return;
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        // Check if we clicked on an existing text node
        const hit = textNodes.find(
          (t) => Math.abs(t.x - x) < 80 && Math.abs(t.y - y) < 16
        );
        if (hit) {
          setEditingTextId(hit.id);
        } else {
          const newNode: TextNode = {
            id: crypto.randomUUID(),
            x,
            y,
            text: "",
          };
          setTextNodes((prev) => [...prev, newNode]);
          setEditingTextId(newNode.id);
          setHasContent(true);
        }
      },
      [tool, textNodes]
    );

    // ── Attach pointer listeners to svg ──
    useEffect(() => {
      const svg = svgRef.current;
      if (!svg) return;
      svg.addEventListener("pointerdown", handlePointerDown);
      svg.addEventListener("pointermove", handlePointerMove);
      svg.addEventListener("pointerup", handlePointerUp);
      svg.addEventListener("pointercancel", handlePointerUp);
      return () => {
        svg.removeEventListener("pointerdown", handlePointerDown);
        svg.removeEventListener("pointermove", handlePointerMove);
        svg.removeEventListener("pointerup", handlePointerUp);
        svg.removeEventListener("pointercancel", handlePointerUp);
      };
    }, [handlePointerDown, handlePointerMove, handlePointerUp]);

    const cursorClass =
      tool === "pen"
        ? "cursor-crosshair"
        : tool === "eraser"
        ? "cursor-cell"
        : tool === "highlight"
        ? "cursor-crosshair"
        : "cursor-text";

    /** Current scroll offset — used to translate stored content-space
     *  Y coordinates back to screen-space when rendering strokes. */
    const scrollY = scrollRef?.current?.scrollTop ?? 0;

    return (
      <div
        ref={containerRef}
        className={`absolute inset-0 ${className}`}
        style={{ pointerEvents: visible || tool !== "pen" ? "auto" : "none" }}
        onMouseEnter={() => setVisible(true)}
      >
        {/* SVG drawing surface */}
        <svg
          ref={svgRef}
          className={`w-full h-full ${cursorClass}`}
          style={{ touchAction: "none" }}
          onClick={handleClick}
        >
          {/* Committed strokes — translate Y by -scrollY to convert
               content-space coords back to screen-space for rendering. */}
          <g transform={`translate(0, ${-scrollY})`}>
          {/* Highlight strokes — rendered below ink with blend mode */}
          {highlightStrokes.map((s) => {
            const outline = getStroke(
              s.points.map((p) => [p.x, p.y, p.pressure]),
              HIGHLIGHT_OPTIONS
            );
            const isPulsing = pulsingHighlightId === s.id;
            return (
              <motion.path
                key={s.id}
                d={getSvgPathFromStrokePoints(outline)}
                fill="rgba(255, 255, 255, 1)"
                stroke="none"
                style={{ mixBlendMode: "screen" }}
                animate={isPulsing
                  ? { opacity: [0.22, 0.55, 0.22] }
                  : { opacity: 0.22 }
                }
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            );
          })}

          {/* Active highlight being drawn */}
          {activeHighlightStroke && activeHighlightStroke.points.length > 1 && (() => {
            const outline = getStroke(
              activeHighlightStroke.points.map((p) => [p.x, p.y, p.pressure]),
              HIGHLIGHT_OPTIONS
            );
            return (
              <path
                d={getSvgPathFromStrokePoints(outline)}
                fill="rgba(255, 255, 255, 0.18)"
                stroke="none"
                style={{ mixBlendMode: "screen" }}
              />
            );
          })()}

          {strokes.map((s) => (
            <path
              key={s.id}
              d={strokeToPath(s)}
              fill="rgba(255,255,255,0.82)"
              stroke="none"
            />
          ))}

          {/* Active (in-progress) stroke */}
          {activeStroke && activeStroke.points.length > 1 && (
            <path
              d={strokeToPath(activeStroke)}
              fill="rgba(255,255,255,0.82)"
              stroke="none"
            />
          )}
          </g>

          {/* Text nodes — rendered at content-space Y minus scroll offset */}
          {textNodes.map((t) => (
            <foreignObject
              key={t.id}
              x={t.x}
              y={t.y - 14 - scrollY}
              width={200}
              height={28}
              style={{ overflow: "visible" }}
            >
              {editingTextId === t.id ? (
                <input
                  autoFocus
                  className="bg-transparent border-b border-white/25 text-white/80 text-xs outline-none w-full"
                  style={{ fontFamily: "'ivy-presto', serif", fontSize: 12 }}
                  value={t.text}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTextNodes((prev) =>
                      prev.map((n) =>
                        n.id === t.id ? { ...n, text: val } : n
                      )
                    );
                  }}
                  onBlur={() => {
                    setEditingTextId(null);
                    // Remove empty nodes
                    setTextNodes((prev) =>
                      prev.filter((n) => n.text.trim() !== "")
                    );
                    onSave?.({ strokes, textNodes });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Escape") {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                />
              ) : (
                <span
                  className="text-white/70 text-xs select-none"
                  style={{ fontFamily: "'ivy-presto', serif", fontSize: 12 }}
                >
                  {t.text}
                </span>
              )}
            </foreignObject>
          ))}
        </svg>

        {/* ── Toolbar — appears on hover/interaction ── */}
        <div
          className={`
            absolute bottom-4 left-1/2 -translate-x-1/2
            flex items-center gap-1
            border border-white/[0.08] bg-black/80 backdrop-blur-sm
            px-3 py-1.5
            transition-opacity duration-300
            ${hasContent || visible ? "opacity-100" : "opacity-0 hover:opacity-100"}
          `}
          style={{ fontFamily: "'Courier New', monospace" }}
          onMouseEnter={() => setVisible(true)}
        >
          {/* Pen */}
          <button
            onClick={() => setTool("pen")}
            className={`px-2 py-1 text-[10px] tracking-widest uppercase transition-colors ${
              tool === "pen" ? "text-white border-b border-white/50" : "text-white/30 hover:text-white/60"
            }`}
            title="Pen (draw)"
          >
            Pen
          </button>

          <span className="text-white/10">|</span>

          {/* Highlight */}
          <button
            onClick={() => setTool("highlight")}
            className={`px-2 py-1 text-[10px] tracking-widest uppercase transition-colors ${
              tool === "highlight" ? "text-white border-b border-white/50" : "text-white/30 hover:text-white/60"
            }`}
            title="Highlight"
          >
            Mark
          </button>

          <span className="text-white/10">|</span>

          {/* Eraser */}
          <button
            onClick={() => setTool("eraser")}
            className={`px-2 py-1 text-[10px] tracking-widest uppercase transition-colors ${
              tool === "eraser" ? "text-white border-b border-white/50" : "text-white/30 hover:text-white/60"
            }`}
            title="Eraser"
          >
            Erase
          </button>

          <span className="text-white/10">|</span>

          {/* Text */}
          <button
            onClick={() => setTool("text")}
            className={`px-2 py-1 text-[10px] tracking-widest uppercase transition-colors ${
              tool === "text" ? "text-white border-b border-white/50" : "text-white/30 hover:text-white/60"
            }`}
            title="Text annotation"
          >
            Text
          </button>

          {hasContent && (
            <>
              <span className="text-white/10">|</span>
              <button
                onClick={() => {
                  setStrokes([]);
                  setTextNodes([]);
                  setHasContent(false);
                  onSave?.({ strokes: [], textNodes: [] });
                }}
                className="px-2 py-1 text-[10px] tracking-widest uppercase text-white/20 hover:text-white/50 transition-colors"
                title="Clear all annotations"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
);

export default NotebookCanvas;
