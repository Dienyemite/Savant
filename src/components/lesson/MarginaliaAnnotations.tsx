/**
 * MarginaliaAnnotation.tsx — Phase 5: Socratic Tutor as Marginalia
 *
 * "The tutor is not a traditional chat box. It is invoked contextually.
 *  If a user selects an area of text, a diagram, or their own handwritten
 *  notes, they can trigger the tutor. The tutor's responses appear as
 *  'marginalia' — text generated next to the content being queried."
 *
 * Renders a collection of AI-generated margin notes positioned at the
 * Y-coordinate of the text selection that triggered them.
 *
 * Each annotation appears to the right of the main content column,
 * styled as a compact handwritten margin annotation.
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useChatStore } from "@/store/chat-store";

export default function MarginaliaAnnotations() {
  const { marginaliaEntries, removeMarginalia } = useChatStore();

  return (
    <AnimatePresence>
      {marginaliaEntries.map((entry) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute right-0 w-52"
          style={{ top: entry.anchorY }}
        >
          {/* Connecting dotted line from content to margin */}
          <div
            className="absolute left-0 top-[10px] h-px w-5"
            style={{
              background:
                "repeating-linear-gradient(to right, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 3px, transparent 3px, transparent 6px)",
            }}
          />

          {/* Annotation bubble */}
          <div
            className="ml-6 relative border-l border-white/[0.08] pl-3 pb-2"
          >
            {/* Dismiss button */}
            <button
              onClick={() => removeMarginalia(entry.id)}
              className="absolute top-0 right-0 text-white/15 hover:text-white/45 transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>

            {/* Selected text reference */}
            <p
              className="text-[9px] tracking-wider text-white/20 mb-1.5 italic line-clamp-2 pr-3"
              style={{ fontFamily: "'ivy-presto', serif" }}
            >
              &ldquo;{entry.selectedText}&rdquo;
            </p>

            {/* AI response — streams in like ink */}
            <div
              className="text-[11px] leading-relaxed text-white/48 pr-3"
              style={{
                fontFamily: "'Courier New', monospace",
                textShadow: "0 0 4px rgba(255,255,255,0.15)",
              }}
            >
              {entry.isStreaming && !entry.content ? (
                <span className="inline-flex items-center gap-1 text-white/20">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  <span>thinking…</span>
                </span>
              ) : (
                <>
                  {entry.content}
                  {entry.isStreaming && (
                    <span className="inline-block w-1 h-3 bg-white/40 ml-0.5 animate-pulse" />
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
