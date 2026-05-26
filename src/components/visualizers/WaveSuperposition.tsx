"use client";

import type { VisualizerProps } from "@/types";

const W = 600;
const H = 300;
const CY = H / 2;
const AMP_SCALE = 80; // pixels per unit amplitude at max=3
const POINTS = 200;

function wavePath(amplitude: number, frequency: number, phase: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= POINTS; i++) {
    const x = (i / POINTS) * W;
    const t = (i / POINTS) * 2 * Math.PI * 2; // 2 cycles across width
    const y = CY - amplitude * AMP_SCALE * Math.sin(frequency * t + phase);
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

export default function WaveSuperposition({ params }: VisualizerProps) {
  const a1 = Math.max(0.1, params.amplitude1 ?? 1);
  const f1 = Math.max(0.5, params.frequency1 ?? 1);
  const a2 = Math.max(0.1, params.amplitude2 ?? 0.5);
  const f2 = Math.max(0.5, params.frequency2 ?? 2);

  const d1 = wavePath(a1, f1, 0);
  const d2 = wavePath(a2, f2, 0);

  // Superposition — sum at each point
  const sumPts: string[] = [];
  for (let i = 0; i <= POINTS; i++) {
    const x = (i / POINTS) * W;
    const t = (i / POINTS) * 2 * Math.PI * 2;
    const y = CY - (a1 * Math.sin(f1 * t) + a2 * Math.sin(f2 * t)) * AMP_SCALE;
    sumPts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const dSum = sumPts.join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block" }}>
      {/* Centre line */}
      <line x1={0} y1={CY} x2={W} y2={CY} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

      {/* Wave 1 */}
      <path d={d1} fill="none" stroke="rgba(100,160,255,0.45)" strokeWidth={1.5} />
      {/* Wave 2 */}
      <path d={d2} fill="none" stroke="rgba(100,220,140,0.45)" strokeWidth={1.5} />
      {/* Sum */}
      <path d={dSum} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={2} />

      {/* Legend */}
      <circle cx={12} cy={14} r={4} fill="rgba(100,160,255,0.6)" />
      <text x={20} y={18} fontSize="9" fill="rgba(255,255,255,0.45)">Wave 1 (A={a1.toFixed(1)}, f={f1.toFixed(1)})</text>
      <circle cx={12} cy={28} r={4} fill="rgba(100,220,140,0.6)" />
      <text x={20} y={32} fontSize="9" fill="rgba(255,255,255,0.45)">Wave 2 (A={a2.toFixed(1)}, f={f2.toFixed(1)})</text>
      <line x1={8} y1={41} x2={16} y2={41} stroke="rgba(255,255,255,0.7)" strokeWidth={2} />
      <text x={20} y={45} fontSize="9" fill="rgba(255,255,255,0.45)">Superposition</text>
    </svg>
  );
}
