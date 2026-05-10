"use client";

import React from "react";

// ============================================
// ErrorBoundary — Notebook-styled fallback
//
// Wraps child components that may throw during
// render or in async lifecycle methods.
// Renders a degraded "torn notebook" UI rather
// than crashing the entire page.
// ============================================

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[ErrorBoundary] Caught error:", error, info);
    }
    // Report to Sentry when configured (dynamic import avoids a hard build dep)
    if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      const dynamicImport = new Function("m", "return import(m)") as (m: string) => Promise<{ captureException: (e: Error, ctx?: unknown) => void }>;
      dynamicImport("@sentry/nextjs").then(({ captureException }) => {
        captureException(error, { extra: { componentStack: info.componentStack } });
      }).catch(() => {/* Sentry not installed — skip */});
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="flex flex-col items-center justify-center min-h-[200px] p-8 border border-white/[0.07] bg-black"
          style={{ fontFamily: "'Courier New', monospace" }}
        >
          <p
            className="text-white/40 text-sm tracking-widest uppercase mb-6"
            style={{ letterSpacing: "0.15em" }}
          >
            Something tore in the notebook.
          </p>
          <button
            onClick={this.handleReload}
            className="text-[10px] tracking-widest uppercase text-white/25 hover:text-white/60 border-b border-white/10 hover:border-white/30 pb-px transition-colors"
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
