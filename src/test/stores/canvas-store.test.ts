/**
 * canvas-store.test.ts — Sprint 7.2.1
 *
 * Tests for the canvas store: stroke lifecycle, highlight, erase,
 * text notes, and hydration.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCanvasStore } from "@/store/canvas-store";

/** Reset store to initial state before each test. */
function resetStore() {
  useCanvasStore.setState({
    activeTool: "select",
    isCoverOpen: true,
    viewport: { x: 0, y: 0, zoom: 1 },
    rfContainerOrigin: { x: 0, y: 0 },
    strokes: [],
    activePoints: [],
    highlightStrokes: [],
    activeHighlightPoints: [],
    textNotes: [],
    onStrokeCommit: undefined,
  });
}

describe("canvas-store — ink strokes", () => {
  beforeEach(resetStore);

  it("beginStroke → extendStroke → commitStroke produces a stroke in strokes[]", () => {
    const store = useCanvasStore.getState();
    store.beginStroke(10, 20, 0.5);
    store.extendStroke(15, 25, 0.6);
    store.commitStroke();

    const { strokes } = useCanvasStore.getState();
    expect(strokes).toHaveLength(1);
    expect(strokes[0].points.length).toBeGreaterThanOrEqual(2);
    expect(strokes[0].tool).toBe("pen");
  });

  it("commitStroke fires onStrokeCommit callback if registered", () => {
    const cb = vi.fn();
    useCanvasStore.getState().setStrokeCommitHandler(cb);
    useCanvasStore.getState().beginStroke(0, 0, 0.5);
    useCanvasStore.getState().extendStroke(5, 5, 0.5);
    useCanvasStore.getState().commitStroke();

    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ tool: "pen" })
    );
  });

  it("eraseNear removes strokes within radius and leaves others intact", () => {
    const store = useCanvasStore.getState();
    // Stroke at origin
    store.beginStroke(5, 5, 0.5);
    store.extendStroke(6, 6, 0.5);
    store.commitStroke();
    // Stroke far away
    store.beginStroke(500, 500, 0.5);
    store.extendStroke(501, 501, 0.5);
    store.commitStroke();

    expect(useCanvasStore.getState().strokes).toHaveLength(2);

    // Erase near origin with radius 50 — should remove only the first stroke
    useCanvasStore.getState().eraseNear(5, 5, 50);

    const { strokes } = useCanvasStore.getState();
    expect(strokes).toHaveLength(1);
    expect(strokes[0].points[0][0]).toBeGreaterThan(100); // far-away stroke remains
  });

  it("clearStrokes empties strokes without affecting text notes", () => {
    const store = useCanvasStore.getState();
    store.beginStroke(0, 0, 0.5);
    store.extendStroke(1, 1, 0.5);
    store.commitStroke();
    store.addNote(50, 50);

    useCanvasStore.getState().clearStrokes();

    const { strokes, textNotes } = useCanvasStore.getState();
    expect(strokes).toHaveLength(0);
    expect(textNotes).toHaveLength(1); // note still there
  });

  it("setActiveTool from pen to eraser updates activeTool", () => {
    useCanvasStore.getState().setActiveTool("pen");
    expect(useCanvasStore.getState().activeTool).toBe("pen");
    useCanvasStore.getState().setActiveTool("eraser");
    expect(useCanvasStore.getState().activeTool).toBe("eraser");
  });
});

describe("canvas-store — text notes", () => {
  beforeEach(resetStore);

  it("addNote → updateNote → finishNote produces a non-editing note", () => {
    const id = useCanvasStore.getState().addNote(100, 200);
    useCanvasStore.getState().updateNote(id, "Hello world");
    useCanvasStore.getState().finishNote(id);

    const note = useCanvasStore.getState().textNotes.find((n) => n.id === id);
    expect(note).toBeDefined();
    expect(note!.content).toBe("Hello world");
    expect(note!.isEditing).toBe(false);
  });

  it("finishNote removes an empty note", () => {
    const id = useCanvasStore.getState().addNote(10, 20);
    useCanvasStore.getState().finishNote(id); // content is ""

    const { textNotes } = useCanvasStore.getState();
    expect(textNotes.find((n) => n.id === id)).toBeUndefined();
  });

  it("deleteNote removes the note", () => {
    const id = useCanvasStore.getState().addNote(0, 0);
    useCanvasStore.getState().updateNote(id, "keep");
    useCanvasStore.getState().finishNote(id);
    useCanvasStore.getState().deleteNote(id);

    expect(useCanvasStore.getState().textNotes.find((n) => n.id === id)).toBeUndefined();
  });

  it("editNote sets isEditing: true", () => {
    const id = useCanvasStore.getState().addNote(0, 0);
    useCanvasStore.getState().updateNote(id, "text");
    useCanvasStore.getState().finishNote(id);
    useCanvasStore.getState().editNote(id);

    const note = useCanvasStore.getState().textNotes.find((n) => n.id === id);
    expect(note!.isEditing).toBe(true);
  });
});

describe("canvas-store — hydrateCanvas", () => {
  beforeEach(resetStore);

  it("restores strokes and textNotes from persisted data", () => {
    const mockStrokes = [
      { id: "s1", points: [[0, 0, 0.5]] as [number, number, number][], tool: "pen" as const },
    ];
    const mockNotes = [
      { id: "n1", x: 10, y: 20, content: "saved note", isEditing: false },
    ];

    useCanvasStore.getState().hydrateCanvas(mockStrokes, mockNotes);

    const { strokes, textNotes } = useCanvasStore.getState();
    expect(strokes).toEqual(mockStrokes);
    expect(textNotes).toEqual(mockNotes);
  });
});
