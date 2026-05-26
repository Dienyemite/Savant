/**
 * src/lib/render-math.ts
 *
 * KaTeX-based math rendering helpers for lesson blocks.
 * Use <MathBlock> for both inline and display-mode LaTeX.
 */

"use client";

import React from "react";
import katex from "katex";

/** Returns true if `s` looks like a LaTeX expression worth rendering. */
export function isLatex(s: string): boolean {
  if (!s) return false;
  return (
    s.includes("\\") ||
    s.includes("^") ||
    s.includes("_") ||
    s.includes("\\frac") ||
    s.includes("\\sqrt") ||
    /[∑∫∂∇]/u.test(s)
  );
}

interface MathBlockProps {
  tex: string;
  /** When true, renders in display (block) mode; otherwise inline. */
  display?: boolean;
  className?: string;
}

/**
 * Renders a LaTeX expression using KaTeX.
 * Falls back to raw text if KaTeX throws.
 */
export function MathBlock({ tex, display = false, className }: MathBlockProps): React.ReactElement {
  let html: string;
  try {
    html = katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      strict: false,
    });
  } catch {
    html = tex; // plain text fallback
  }

  return React.createElement(display ? "div" : "span", {
    className,
    dangerouslySetInnerHTML: { __html: html },
  });
}
