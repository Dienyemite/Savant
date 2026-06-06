"use client";

/**
 * useCurriculumGeneration
 *
 * Drives sequential background lesson generation for curriculum tour pages.
 * Fires POST /api/pages/[id]/generate-lesson for each page in order,
 * waiting for each to complete before starting the next.
 *
 * Page 1 (index 0) is always generated first so the user can open it
 * immediately while the rest queue up.
 *
 * Usage:
 *   const gen = useCurriculumGeneration();
 *   gen.start(["page-id-1", "page-id-2", ...]);
 *   // gen.completedIds — Set<string> of page IDs whose lessons are ready
 *   // gen.currentId   — page ID currently being generated (null if idle)
 *   // gen.isActive    — true while queue is running
 *   // gen.progress    — { done: number; total: number }
 */

import { useState, useRef, useCallback } from "react";

export interface CurriculumGenerationState {
  isActive: boolean;
  currentId: string | null;
  completedIds: Set<string>;
  failedIds: Set<string>;
  progress: { done: number; total: number };
  start: (pageIds: string[]) => void;
  stop: () => void;
}

export function useCurriculumGeneration(): CurriculumGenerationState {
  const [isActive, setIsActive] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);

  // Abort signal so stop() cancels an in-flight fetch
  const abortRef = useRef<AbortController | null>(null);
  const stoppedRef = useRef(false);

  const start = useCallback((pageIds: string[]) => {
    if (pageIds.length === 0) return;

    // Reset state
    stoppedRef.current = false;
    setIsActive(true);
    setCurrentId(null);
    setCompletedIds(new Set());
    setFailedIds(new Set());
    setTotal(pageIds.length);

    async function runQueue() {
      for (const id of pageIds) {
        if (stoppedRef.current) break;

        setCurrentId(id);
        abortRef.current = new AbortController();

        try {
          const res = await fetch(`/api/pages/${id}/generate-lesson`, {
            method: "POST",
            signal: abortRef.current.signal,
          });

          if (res.ok) {
            setCompletedIds((prev) => new Set([...prev, id]));
          } else {
            console.warn(`[curriculum-gen] Failed for page ${id}: ${res.status}`);
            setFailedIds((prev) => new Set([...prev, id]));
          }
        } catch (err) {
          if ((err as Error).name === "AbortError") break;
          console.warn(`[curriculum-gen] Error for page ${id}:`, err);
          setFailedIds((prev) => new Set([...prev, id]));
        }
      }

      setCurrentId(null);
      setIsActive(false);
    }

    runQueue();
  }, []);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    abortRef.current?.abort();
    setIsActive(false);
    setCurrentId(null);
  }, []);

  const done = completedIds.size + failedIds.size;

  return {
    isActive,
    currentId,
    completedIds,
    failedIds,
    progress: { done, total },
    start,
    stop,
  };
}
