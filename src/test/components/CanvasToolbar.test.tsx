/**
 * CanvasToolbar.test.tsx — Sprint 7.3.4
 *
 * Tests: 5 buttons render, clicks update activeTool, keyboard shortcuts work.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CanvasToolbar from "@/components/canvas/CanvasToolbar";
import { useCanvasStore } from "@/store/canvas-store";

function resetStore() {
  useCanvasStore.setState({ activeTool: "select" });
}

describe("CanvasToolbar", () => {
  beforeEach(resetStore);

  it("renders 5 tool buttons", () => {
    render(<CanvasToolbar />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(5);
  });

  it("clicking Pen button sets activeTool to 'pen'", () => {
    render(<CanvasToolbar />);
    const penBtn = screen.getByTitle(/Pen/i);
    fireEvent.click(penBtn);
    expect(useCanvasStore.getState().activeTool).toBe("pen");
  });

  it("clicking Eraser button sets activeTool to 'eraser'", () => {
    render(<CanvasToolbar />);
    const eraserBtn = screen.getByTitle(/Eraser/i);
    fireEvent.click(eraserBtn);
    expect(useCanvasStore.getState().activeTool).toBe("eraser");
  });

  it("clicking Text button sets activeTool to 'text'", () => {
    render(<CanvasToolbar />);
    const textBtn = screen.getByTitle(/Text/i);
    fireEvent.click(textBtn);
    expect(useCanvasStore.getState().activeTool).toBe("text");
  });

  it("pressing 'P' keyboard shortcut sets activeTool to 'pen'", () => {
    render(<CanvasToolbar />);
    fireEvent.keyDown(window, { key: "p" });
    expect(useCanvasStore.getState().activeTool).toBe("pen");
  });

  it("pressing 'E' keyboard shortcut sets activeTool to 'eraser'", () => {
    render(<CanvasToolbar />);
    fireEvent.keyDown(window, { key: "e" });
    expect(useCanvasStore.getState().activeTool).toBe("eraser");
  });

  it("pressing 'T' keyboard shortcut sets activeTool to 'text'", () => {
    render(<CanvasToolbar />);
    fireEvent.keyDown(window, { key: "t" });
    expect(useCanvasStore.getState().activeTool).toBe("text");
  });

  it("pressing 'V' keyboard shortcut sets activeTool to 'select'", () => {
    useCanvasStore.setState({ activeTool: "pen" });
    render(<CanvasToolbar />);
    fireEvent.keyDown(window, { key: "v" });
    expect(useCanvasStore.getState().activeTool).toBe("select");
  });
});
