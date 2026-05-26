"use client";

import type { VisualizerProps } from "@/types";

const W = 600;
const H = 300;
const PAD_L = 60;
const PAD_R = 20;
const PAD_T = 20;
const PAD_B = 40;
const POINTS = 120;
const X_RANGE = 10; // x from -10 to +10

export default function FunctionPlot({ params }: VisualizerProps) {
  const a = params.a ?? 1;
  const b = params.b ?? 0;
  const c = params.c ?? 0;

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  function f(x: number): number {
    return a * x * x + b * x + c;
  }

  // Auto y-scale: sample a few points
  const xs = Array.from({ length: 21 }, (_, i) => -X_RANGE + i * X_RANGE);
  const ys = xs.map(f);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const yRange = yMax - yMin || 2;
  const yPad = yRange * 0.15;
  const yLo = yMin - yPad;
  const yHi = yMax + yPad;

  function toSvg(x: number, y: number): [number, number] {
    const svgX = PAD_L + ((x + X_RANGE) / (2 * X_RANGE)) * plotW;
    const svgY = PAD_T + ((yHi - y) / (yHi - yLo)) * plotH;
    return [svgX, svgY];
  }

  // Build path
  const pts: string[] = [];
  for (let i = 0; i <= POINTS; i++) {
    const x = -X_RANGE + (i / POINTS) * 2 * X_RANGE;
    const y = f(x);
    const [sx, sy] = toSvg(x, y);
    if (sy < PAD_T - 5 || sy > H - PAD_B + 5) {
      if (pts.length > 0) pts.push(`M${sx.toFixed(1)},${sy.toFixed(1)}`);
    } else {
      pts.push(`${pts.length === 0 || pts[pts.length - 1].startsWith("M") ? "M" : "L"}${sx.toFixed(1)},${sy.toFixed(1)}`);
    }
  }
  const d = pts.join(" ");

  // Axis positions
  const [, yAxisY0] = toSvg(0, yHi);
  const [, yAxisY1] = toSvg(0, yLo);
  const [xAxisX0, xAxisSvgY] = toSvg(-X_RANGE, 0);
  const [xAxisX1] = toSvg(X_RANGE, 0);
  const [originX, originY] = toSvg(0, 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block" }}>
      {/* Y axis */}
      <line x1={originX} y1={PAD_T} x2={originX} y2={H - PAD_B} stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="4,3" />
      {/* X axis */}
      <line x1={xAxisX0} y1={xAxisSvgY} x2={xAxisX1} y2={xAxisSvgY} stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="4,3" />
      {/* Origin dot */}
      <circle cx={originX} cy={originY} r={2} fill="rgba(255,255,255,0.3)" />

      {/* Curve */}
      <path d={d} fill="none" stroke="rgba(100,200,255,0.85)" strokeWidth={2.5} strokeLinecap="round" />

      {/* Labels */}
      <text x={PAD_L / 2} y={PAD_T + plotH / 2} fontSize="9" fill="rgba(255,255,255,0.35)" transform={`rotate(-90,${PAD_L / 2},${PAD_T + plotH / 2})`} textAnchor="middle">y</text>
      <text x={W - PAD_R} y={xAxisSvgY + 14} fontSize="9" fill="rgba(255,255,255,0.35)" textAnchor="end">x</text>

      {/* Formula */}
      <text x={W / 2} y={H - 6} fontSize="10" fill="rgba(100,200,255,0.6)" textAnchor="middle">
        y = {a !== 1 ? a : ""}x² {b !== 0 ? (b > 0 ? `+ ${b}` : `- ${Math.abs(b)}`) : ""}{c !== 0 ? (c > 0 ? ` + ${c}` : ` - ${Math.abs(c)}`) : ""}
      </text>
    </svg>
  );
}
