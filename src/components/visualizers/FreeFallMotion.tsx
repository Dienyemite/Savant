"use client";

import type { VisualizerProps } from "@/types";

const G = 9.8;
const W = 600;
const H = 300;
const PAD_L = 60;
const PAD_T = 20;
const PAD_B = 30;
const POINTS = 80;

export default function FreeFallMotion({ params }: VisualizerProps) {
  const height = Math.max(1, params.height ?? 20);
  const tFinal = Math.sqrt((2 * height) / G);

  // Position-time parabola: h(t) = height - 0.5*g*t²
  const plotW = W - PAD_L - 20;
  const plotH = H - PAD_T - PAD_B;
  const scaleX = plotW / tFinal;
  const scaleY = plotH / height;

  const pts: string[] = [];
  for (let i = 0; i <= POINTS; i++) {
    const t = (i / POINTS) * tFinal;
    const h = height - 0.5 * G * t * t;
    const x = PAD_L + t * scaleX;
    const y = PAD_T + (height - h) * scaleY; // top = max height
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const d = pts.join(" ");

  const axisBottom = PAD_T + plotH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block" }}>
      {/* Axes */}
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={axisBottom} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
      <line x1={PAD_L} y1={axisBottom} x2={W - 10} y2={axisBottom} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />

      {/* Axis labels */}
      <text x={PAD_L - 8} y={PAD_T + 4} fontSize="9" fill="rgba(255,255,255,0.4)" textAnchor="end">{height}m</text>
      <text x={PAD_L - 8} y={axisBottom + 2} fontSize="9" fill="rgba(255,255,255,0.4)" textAnchor="end">0</text>
      <text x={20} y={H / 2} fontSize="9" fill="rgba(255,255,255,0.35)" transform={`rotate(-90,20,${H / 2})`} textAnchor="middle">
        Height (m)
      </text>
      <text x={PAD_L + plotW / 2} y={H - 4} fontSize="9" fill="rgba(255,255,255,0.35)" textAnchor="middle">
        Time (s)
      </text>
      <text x={PAD_L + plotW} y={axisBottom + 12} fontSize="9" fill="rgba(255,255,255,0.3)" textAnchor="end">
        {tFinal.toFixed(2)}s
      </text>

      {/* Curve */}
      <path d={d} fill="none" stroke="rgba(255,120,80,0.85)" strokeWidth={2.5} />

      {/* Impact marker */}
      <circle cx={PAD_L + plotW} cy={axisBottom} r={4} fill="rgba(255,120,80,0.7)" />

      {/* Info text */}
      <text x={PAD_L + plotW / 2} y={PAD_T + 14} fontSize="10" fill="rgba(255,255,255,0.4)" textAnchor="middle">
        h={height}m  →  impact in {tFinal.toFixed(2)}s  at {(G * tFinal).toFixed(1)}m/s
      </text>
    </svg>
  );
}
