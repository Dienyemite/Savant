"use client";

import { motion } from "framer-motion";
import type { TextBlock } from "@/types";

// Simple markdown-like parser for our lesson text
// Supports: # headings, **bold**, *italic*, \n\n paragraphs
function parseMarkdown(content: string): React.ReactNode[] {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.trim() === "") {
      elements.push(<div key={key++} className="h-3" />);
      continue;
    }

    // Heading
    if (line.startsWith("# ")) {
      elements.push(
        <h1
          key={key++}
          className="text-2xl font-bold text-slate-100 tracking-tight mb-2"
        >
          {parseInline(line.slice(2))}
        </h1>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} className="text-xl font-semibold text-slate-200 mb-2">
          {parseInline(line.slice(3))}
        </h2>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} className="text-base text-slate-300 leading-relaxed">
        {parseInline(line)}
      </p>
    );
  }

  return elements;
}

// Parse inline markdown: **bold**, *italic*
function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match **bold** and *italic* patterns
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Push text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // Bold
      parts.push(
        <strong key={key++} className="font-semibold text-slate-100">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // Italic
      parts.push(
        <em key={key++} className="italic text-slate-200">
          {match[3]}
        </em>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

const STYLE_CLASSES: Record<string, string> = {
  heading: "",
  body: "",
  hint: "border-l-2 border-amber-500/50 pl-4 bg-amber-500/5 py-3 rounded-r-lg",
  callout:
    "border-l-2 border-cyan-500/50 pl-4 bg-cyan-500/5 py-3 rounded-r-lg",
};

interface Props {
  block: TextBlock;
}

export default function TextBlockRenderer({ block }: Props) {
  const styleClass = STYLE_CLASSES[block.style ?? "body"] ?? "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`space-y-2 ${styleClass}`}
    >
      {parseMarkdown(block.content)}
    </motion.div>
  );
}
