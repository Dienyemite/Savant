"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import type { TextBlock } from "@/types";
import type { SpatialBlock } from "@/types";
import { MathBlock } from "@/lib/render-math";

// ─────────────────────────────────────────────
// Content parsing helpers
// ─────────────────────────────────────────────

interface Segment {
  tag: "h1" | "h2" | "p" | "spacer";
  text: string; // raw text (no markdown)
}

/** Splits block content into renderable segments, each trackable by a ref. */
function parseSegments(content: string): Segment[] {
  return content.split("\n").map((line): Segment => {
    if (line.trim() === "") return { tag: "spacer", text: "" };
    if (line.startsWith("# ")) return { tag: "h1", text: line.slice(2) };
    if (line.startsWith("## ")) return { tag: "h2", text: line.slice(3) };
    return { tag: "p", text: line };
  });
}

// Split text on display math ($$...$$) and inline math ($...$)
type InlinePart =
  | { kind: "text"; value: string }
  | { kind: "math"; value: string; display: boolean };

function splitMath(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  // Match $$...$$ (display) or $...$ (inline)
  const regex = /\$\$(.+?)\$\$|\$(.+?)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ kind: "text", value: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      parts.push({ kind: "math", value: match[1], display: true });
    } else if (match[2] !== undefined) {
      parts.push({ kind: "math", value: match[2], display: false });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ kind: "text", value: text.slice(lastIndex) });
  }
  return parts.length > 0 ? parts : [{ kind: "text", value: text }];
}

// Parse inline markdown: **bold**, *italic* within a plain text segment
function parseInlineMarkdown(text: string, baseKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = baseKey;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[2]) {
      parts.push(<strong key={key++} className="font-semibold text-white/90">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={key++} className="italic text-white/80">{match[3]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : [text];
}

/** Parses a line of text that may contain $...$ or $$...$$ into React nodes. */
function parseInline(text: string): React.ReactNode[] {
  const mathParts = splitMath(text);
  const result: React.ReactNode[] = [];
  mathParts.forEach((part, i) => {
    if (part.kind === "math") {
      result.push(
        <MathBlock key={i} tex={part.value} display={part.display} />
      );
    } else {
      result.push(...parseInlineMarkdown(part.value, i * 100));
    }
  });
  return result;
}

const STYLE_CLASSES: Record<string, string> = {
  heading: "",
  body: "",
  hint: "border-l border-white/15 pl-4 py-2 text-white/50 italic",
  callout: "border-l border-white/[0.08] pl-4 py-2 text-white/40",
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

interface Props {
  block: TextBlock;
  onSpatialUpdate?: (blocks: SpatialBlock[]) => void;
}

export default function TextBlockRenderer({ block, onSpatialUpdate }: Props) {
  const styleClass = STYLE_CLASSES[block.style ?? "body"] ?? "";
  const segments = useMemo(() => parseSegments(block.content), [block.content]);

  // One ref per segment — spacers are not tracked (null entries are skipped)
  const segmentRefs = useRef<(HTMLElement | null)[]>([]);

  const reportSpatial = useCallback(() => {
    if (!onSpatialUpdate) return;
    const results: SpatialBlock[] = [];
    let paragraphIndex = 0;
    segments.forEach((seg, i) => {
      if (seg.tag === "spacer") return;
      const el = segmentRefs.current[i];
      if (el) {
        results.push({
          blockId: block.id,
          paragraphIndex: paragraphIndex++,
          text: seg.text,
          rect: el.getBoundingClientRect(),
        });
      }
    });
    onSpatialUpdate(results);
  }, [onSpatialUpdate, block.id, segments]);

  useEffect(() => {
    if (!onSpatialUpdate) return;

    // Initial measurement after layout
    reportSpatial();

    // Re-measure on resize
    const observer = new ResizeObserver(reportSpatial);
    segmentRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [onSpatialUpdate, reportSpatial]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`space-y-2 ${styleClass}`}
    >
      {segments.map((seg, i) => {
        const setRef = (el: HTMLElement | null) => {
          segmentRefs.current[i] = el;
        };

        if (seg.tag === "spacer") return <div key={i} className="h-3" />;
        if (seg.tag === "h1") return (
          <h1
            key={i}
            ref={setRef as React.RefCallback<HTMLHeadingElement>}
            className="text-xl font-semibold text-white/80 tracking-tight mb-3 border-b border-white/[0.07] pb-2"
            style={{ fontFamily: "'ivy-presto', serif" }}
          >
            {parseInline(seg.text)}
          </h1>
        );
        if (seg.tag === "h2") return (
          <h2
            key={i}
            ref={setRef as React.RefCallback<HTMLHeadingElement>}
            className="text-xl font-semibold text-white/80 mb-2"
            style={{ fontFamily: "'ivy-presto', serif" }}
          >
            {parseInline(seg.text)}
          </h2>
        );
        return (
          <p
            key={i}
            ref={setRef as React.RefCallback<HTMLParagraphElement>}
            className="text-base text-white/70 leading-relaxed"
          >
            {parseInline(seg.text)}
          </p>
        );
      })}
    </motion.div>
  );
}
