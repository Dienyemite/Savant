/**
 * TextNoteLayer.tsx — Click-anywhere free-form text notes
 *
 * Phase 3: "Free-form Typing: Implement an event listener where a
 * single click on an empty canvas space spawns a text input box.
 * Once typing is complete, render that text permanently onto the
 * canvas layer."
 *
 * Notes render as monospace "handwritten" annotations, glowing
 * like chalk or white gel ink (matching the aesthetic spec).
 * Double-click any note to re-edit it.
 */

"use client";

import { useCallback } from "react";
import { useCanvasStore } from "@/store/canvas-store";

export default function TextNoteLayer() {
  const {
    activeTool,
    textNotes,
    addNote,
    updateNote,
    finishNote,
    editNote,
    deleteNote,
  } = useCanvasStore();

  const isTextMode = activeTool === "text";

  // ── Canvas click → spawn note ──
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isTextMode) return;
      // Only spawn on empty canvas, not on existing notes
      if ((e.target as HTMLElement).closest("[data-text-note]")) return;
      addNote(e.clientX, e.clientY);
    },
    [isTextMode, addNote]
  );

  return (
    <div
      className="fixed inset-0 w-full h-full"
      style={{
        zIndex: 25,
        pointerEvents: isTextMode ? "all" : "none",
        cursor: isTextMode ? "text" : "default",
      }}
      onClick={handleCanvasClick}
    >
      {textNotes.map((note) => (
        <div
          key={note.id}
          data-text-note="true"
          className="absolute"
          style={{
            left: note.x,
            top: note.y,
            transform: "translate(-2px, -2px)",
            pointerEvents: "all",
          }}
        >
          {note.isEditing ? (
            <textarea
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              className="bg-transparent border-none outline-none resize-none"
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: "13px",
                lineHeight: "1.6",
                color: "rgba(255,255,255,0.82)",
                textShadow:
                  "0 0 6px rgba(255,255,255,0.35), 0 0 14px rgba(255,255,255,0.12)",
                caretColor: "rgba(255,255,255,0.9)",
                minWidth: "160px",
                minHeight: "22px",
                width: "auto",
                maxWidth: "320px",
              }}
              value={note.content}
              rows={1}
              onChange={(e) => {
                updateNote(note.id, e.target.value);
                // Auto-grow height
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onBlur={() => finishNote(note.id)}
              onKeyDown={(e) => {
                if (e.key === "Escape") finishNote(note.id);
                if (e.key === "Backspace" && !note.content)
                  deleteNote(note.id);
              }}
            />
          ) : (
            <p
              className="whitespace-pre-wrap cursor-default"
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: "13px",
                lineHeight: "1.6",
                color: "rgba(255,255,255,0.72)",
                textShadow:
                  "0 0 5px rgba(255,255,255,0.28), 0 0 12px rgba(255,255,255,0.1)",
                maxWidth: "320px",
                userSelect: "none",
              }}
              onDoubleClick={() => editNote(note.id)}
            >
              {note.content}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
