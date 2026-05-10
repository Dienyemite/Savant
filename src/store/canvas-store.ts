/**
 * canvas-store.ts — Global infinite canvas state
 *
 * Manages:
 *  • active drawing tool (select / pen / eraser / text)
 *  • ink strokes drawn on the global canvas (screen-space)
 *  • free-form text notes placed anywhere on canvas
 *  • cover-open state (the "front cover" of the notebook)
 *
 * Phase 3 of the Endless Monochrome Notebook spec:
 * "Stylus Support: Allow users to draw, annotate, and write
 *  equations directly over the text, diagrams, and empty space."
 */

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

// ─────────────────────────────────────────────
// Zoom threshold constants (Phase 1.7)
// ─────────────────────────────────────────────

/** Minimum zoom level — fully zoomed out, pure constellation view. */
export const CONSTELLATION_ZOOM_MIN = 0.3;

/**
 * When zoom exceeds this threshold while a concept node is centred in the
 * viewport, the app should transition into the spatial lesson view.
 * Currently lessons open as a fixed overlay; Phase 1.7 will implement the
 * full spatial crossfade. The constant is defined here so it is a named
 * value rather than a magic number scattered across components.
 */
export const LESSON_ZOOM_THRESHOLD = 1.8;

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

/** A single freehand ink stroke. Points are [x, y, pressure]. */
export interface InkStroke {
  id: string;
  points: [number, number, number][];
  /** Which tool created this stroke — used by Smart Annotation to distinguish
   *  highlight strokes (trigger annotation) from regular pen strokes (do not). */
  tool: CanvasTool;
}

/** A wide semi-transparent highlight stroke (canvas-space). */
export interface HighlightStroke {
  id: string;
  points: [number, number, number][];
  opacity: number;
}

/** A free-form text note placed anywhere on the canvas. */
export interface GlobalTextNote {
  id: string;
  x: number; // screen-space px
  y: number;
  content: string;
  isEditing: boolean;
}

export type CanvasTool = "select" | "pen" | "eraser" | "text" | "highlight";

// ─────────────────────────────────────────────
// Store interface
// ─────────────────────────────────────────────

interface CanvasStore {
  // ── Tool ──
  activeTool: CanvasTool;
  setActiveTool: (tool: CanvasTool) => void;

  // ── Cover (Phase 2: "The Front Cover" landing page) ──
  isCoverOpen: boolean;
  closeCover: () => void;

  /**
   * The current ReactFlow viewport. Kept in sync via KnowledgeGraph's
   * onMove / onInit callbacks. Used by InkLayer and TextNoteLayer to
   * convert screen coords ↔ canvas coords so strokes/notes stay pinned
   * to the canvas paper rather than the screen.
   */
  viewport: { x: number; y: number; zoom: number };
  setViewport: (x: number, y: number, zoom: number) => void;

  /**
   * Screen-space top-left of the ReactFlow container (i.e. the
   * notebook-content area, which is offset 72px from the left edge).
   * Set once on mount and on window resize via KnowledgeGraph.
   */
  rfContainerOrigin: { x: number; y: number };
  setRfContainerOrigin: (x: number, y: number) => void;

  // ── Ink strokes (Phase 3: stylus + mouse drawing) ──
  strokes: InkStroke[];
  /** Points being accumulated for the current in-progress stroke */
  activePoints: [number, number, number][];
  beginStroke: (x: number, y: number, pressure: number) => void;
  extendStroke: (x: number, y: number, pressure: number) => void;
  /** Finalise the current stroke and append it to strokes[] */
  commitStroke: () => void;
  /** Erase strokes whose points are within `radius` canvas-units of (x, y) */
  eraseNear: (x: number, y: number, radius?: number) => void;
  clearStrokes: () => void;

  // ── Stroke completion hook (Sprint 3.3.2) ──
  /** Called after every committed pen stroke — used by Smart Annotation in Phase 5 */
  onStrokeCommit?: (stroke: InkStroke) => void;
  setStrokeCommitHandler: (fn: (stroke: InkStroke) => void) => void;
  clearStrokeCommitHandler: () => void;

  // ── Highlight strokes (Sprint 3.3.1) ──
  highlightStrokes: HighlightStroke[];
  activeHighlightPoints: [number, number, number][];
  beginHighlight: (x: number, y: number, pressure: number) => void;
  extendHighlight: (x: number, y: number, pressure: number) => void;
  commitHighlight: () => void;

  // ── Text notes (Phase 3: free-form typing) ──
  textNotes: GlobalTextNote[];
  /** Spawn a new note in edit mode at (x, y) and return its id */
  addNote: (x: number, y: number) => string;
  updateNote: (id: string, content: string) => void;
  /** Commit the note (remove if empty) */
  finishNote: (id: string) => void;
  /** Re-enter edit mode on a committed note */
  editNote: (id: string) => void;
  deleteNote: (id: string) => void;

  // ── Sprint 1.7: Pre-lesson viewport (for back-navigation restore) ──
  /** Saved viewport snapshot taken when a lesson activates. Restored on exit. */
  preLessonViewport: { x: number; y: number; zoom: number } | null;
  storePreLessonViewport: () => void;
  clearPreLessonViewport: () => void;

  // ── Persistence (Sprint 6.3) ──
  /** Restores ink strokes and text notes loaded from Supabase on app init */
  hydrateCanvas: (strokes: InkStroke[], textNotes: GlobalTextNote[]) => void;
}

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // ── Tool ──
  activeTool: "select",
  setActiveTool: (tool) => set({ activeTool: tool }),

  // ── Cover ── starts open so user sees the "front cover" first
  isCoverOpen: true,
  closeCover: () => set({ isCoverOpen: false }),

  // ── Viewport (synced from ReactFlow) ──
  viewport: { x: 0, y: 0, zoom: 1 },
  setViewport: (x, y, zoom) => set({ viewport: { x, y, zoom } }),

  rfContainerOrigin: { x: 0, y: 0 },
  setRfContainerOrigin: (x, y) => set({ rfContainerOrigin: { x, y } }),

  // ── Ink ──
  strokes: [],
  activePoints: [],

  beginStroke: (x, y, pressure) =>
    set({ activePoints: [[x, y, pressure]] }),

  extendStroke: (x, y, pressure) =>
    set((s) => ({
      activePoints: [...s.activePoints, [x, y, pressure]],
    })),

  commitStroke: () => {
    const { activePoints, onStrokeCommit } = get();
    if (activePoints.length < 2) {
      set({ activePoints: [] });
      return;
    }
    const stroke: InkStroke = { id: uuidv4(), points: [...activePoints], tool: "pen" };
    set((s) => ({
      strokes: [...s.strokes, stroke],
      activePoints: [],
    }));
    onStrokeCommit?.(stroke);
  },

  eraseNear: (x, y, radius = 20) =>
    set((s) => ({
      strokes: s.strokes.filter(
        (stroke) =>
          !stroke.points.some(([px, py]) => Math.hypot(px - x, py - y) < radius)
      ),
    })),

  clearStrokes: () => set({ strokes: [], activePoints: [] }),

  // ── Stroke completion hook ──
  onStrokeCommit: undefined,
  setStrokeCommitHandler: (fn) => set({ onStrokeCommit: fn }),
  clearStrokeCommitHandler: () => set({ onStrokeCommit: undefined }),

  // ── Highlight strokes ──
  highlightStrokes: [],
  activeHighlightPoints: [],

  beginHighlight: (x, y, pressure) =>
    set({ activeHighlightPoints: [[x, y, pressure]] }),

  extendHighlight: (x, y, pressure) =>
    set((s) => ({
      activeHighlightPoints: [...s.activeHighlightPoints, [x, y, pressure]],
    })),

  commitHighlight: () => {
    const { activeHighlightPoints, onStrokeCommit } = get();
    if (activeHighlightPoints.length < 2) {
      set({ activeHighlightPoints: [] });
      return;
    }
    const highlight: HighlightStroke = {
      id: uuidv4(),
      points: [...activeHighlightPoints],
      opacity: 0.22,
    };
    // Also create an InkStroke record with tool: "highlight" so the
    // Smart Annotation engine can intercept it via onStrokeCommit.
    const stroke: InkStroke = {
      id: highlight.id,
      points: [...activeHighlightPoints],
      tool: "highlight",
    };
    set((s) => ({
      highlightStrokes: [...s.highlightStrokes, highlight],
      activeHighlightPoints: [],
    }));
    onStrokeCommit?.(stroke);
  },

  // ── Text notes ──
  textNotes: [],

  addNote: (x, y) => {
    const id = uuidv4();
    set((s) => ({
      textNotes: [
        ...s.textNotes,
        { id, x, y, content: "", isEditing: true },
      ],
    }));
    return id;
  },

  updateNote: (id, content) =>
    set((s) => ({
      textNotes: s.textNotes.map((n) =>
        n.id === id ? { ...n, content } : n
      ),
    })),

  finishNote: (id) =>
    set((s) => ({
      textNotes: s.textNotes
        .map((n) => (n.id === id ? { ...n, isEditing: false } : n))
        // Remove notes that were saved empty
        .filter((n) => n.isEditing || n.content.trim().length > 0),
    })),

  editNote: (id) =>
    set((s) => ({
      textNotes: s.textNotes.map((n) =>
        n.id === id ? { ...n, isEditing: true } : n
      ),
    })),

  deleteNote: (id) =>
    set((s) => ({
      textNotes: s.textNotes.filter((n) => n.id !== id),
    })),

  // ── Sprint 1.7: Pre-lesson viewport ──
  preLessonViewport: null,
  storePreLessonViewport: () => set({ preLessonViewport: { ...get().viewport } }),
  clearPreLessonViewport: () => set({ preLessonViewport: null }),

  hydrateCanvas: (inkStrokes, inkTextNotes) =>
    set({ strokes: inkStrokes, textNotes: inkTextNotes }),
}));
