/**
 * SelectionTrigger.tsx — Phase 5: Text Selection → Marginalia
 *
 * Listens for text selections within the lesson content area.
 * When the user selects text, a small "≣ Ask Savant" tooltip
 * appears at the end of the selection. Clicking it:
 *
 *  1. Records the selection's Y position (for marginalia anchoring)
 *  2. Sends the selected text + lesson context to /api/chat
 *  3. Streams the response into a MarginaliaEntry at that Y position
 *
 * The trigger button disappears when the selection is cleared.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useChatStore } from "@/store/chat-store";
import { useLessonStore } from "@/store/lesson-store";
import { useGraphStore } from "@/store/graph-store";
import { DOMAIN_LABELS } from "@/types";
import type { LessonContext } from "@/lib/socratic-prompt";

interface TriggerPosition {
  x: number;
  y: number;
  anchorY: number; // page-relative Y for marginalia placement
  selectedText: string;
}

/**
 * Builds a minimal LessonContext enriched with the selected text
 * so the LLM can respond contextually to what the student highlighted.
 */
function buildContextForSelection(selectedText: string): LessonContext | null {
  const lessonState = useLessonStore.getState();
  const graphState = useGraphStore.getState();
  const { activeLesson, activeLessonConceptId, currentSlideIndex, totalSlides, getProgress, getCurrentBlock, getBlockAnswer } = lessonState;

  if (!activeLesson || !activeLessonConceptId) return null;
  const concept = graphState.concepts.find((c) => c.id === activeLessonConceptId);
  if (!concept) return null;

  const block = getCurrentBlock();
  if (!block) return null;
  const answer = getBlockAnswer(block.id);
  const { id: _id, order: _order, ...blockContent } = block;

  return {
    lessonTitle: activeLesson.title,
    lessonDescription: `Student selected: "${selectedText}". ${activeLesson.description ?? ""}`,
    conceptTitle: concept.title,
    conceptDomain: DOMAIN_LABELS[concept.domain],
    currentBlockType: block.type,
    currentBlockContent: blockContent as Record<string, unknown>,
    studentAnswer: answer.value,
    attemptCount: answer.attempts,
    slideIndex: currentSlideIndex,
    totalSlides,
    lessonProgress: getProgress(),
  };
}

export default function SelectionTrigger({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [trigger, setTrigger] = useState<TriggerPosition | null>(null);
  const isAskingRef = useRef(false);
  const { addMarginaliaEntry, updateMarginalia, finishMarginalia } = useChatStore();
  const { isLessonActive } = useLessonStore();

  // Detect text selections within the lesson container
  useEffect(() => {
    if (!isLessonActive) return;

    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        if (!isAskingRef.current) setTrigger(null);
        return;
      }

      const text = sel.toString().trim();
      if (text.length < 5) return; // ignore tiny selections

      // Check if selection is inside our container
      const container = containerRef.current;
      if (!container) return;
      const range = sel.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) return;

      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      setTrigger({
        x: rect.right + 6,
        y: rect.top - 4,
        // Y relative to the scrollable container for marginalia placement
        anchorY: rect.top - containerRect.top + (container.scrollTop ?? 0),
        selectedText: text,
      });
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [isLessonActive, containerRef]);

  const handleAsk = useCallback(async () => {
    if (!trigger || isAskingRef.current) return;
    isAskingRef.current = true;

    const ctx = buildContextForSelection(trigger.selectedText);
    if (!ctx) { isAskingRef.current = false; return; }

    // Clear the browser selection so the trigger hides
    window.getSelection()?.removeAllRanges();
    setTrigger(null);

    // Create a marginalia entry — streams the response in
    const entryId = addMarginaliaEntry(trigger.anchorY, trigger.selectedText);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `I'm reading this passage and want to understand it better: "${trigger.selectedText}"`,
            },
          ],
          lessonContext: ctx,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok || !res.body) {
        updateMarginalia(entryId, "I couldn't reach the tutor right now. Try again?");
        finishMarginalia(entryId);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        updateMarginalia(entryId, accumulated);
      }

      if (accumulated) updateMarginalia(entryId, accumulated);
    } catch (err) {
      clearTimeout(timeout);
      const msg =
        err instanceof DOMException && err.name === "AbortError"
          ? "Savant is thinking slowly — try again."
          : "Connection error. Try again?";
      updateMarginalia(entryId, msg);
    } finally {
      finishMarginalia(entryId);
      isAskingRef.current = false;
    }
  }, [trigger, addMarginaliaEntry, updateMarginalia, finishMarginalia]);

  if (!trigger) return null;

  return (
    <div
      className="fixed z-[70] flex items-center gap-1 px-2 py-1 bg-black border border-white/[0.12] cursor-pointer hover:border-white/30 transition-colors"
      style={{ left: trigger.x, top: trigger.y }}
      onMouseDown={(e) => { e.preventDefault(); handleAsk(); }}
    >
      <span
        className="text-[9px] tracking-widest uppercase text-white/35 hover:text-white/65 transition-colors"
        style={{ fontFamily: "'Courier New', monospace" }}
      >
        ≣ Ask Savant
      </span>
    </div>
  );
}
