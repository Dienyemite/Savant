"use client";

import type { VisualizerProps } from "@/types";

const W = 600;
const H = 300;
const CY = H / 2;
const AMP_SCALE = 90;
const POINTS = 200;

export default function SimpleHarmonicMotion({ params }: VisualizerProps) {
  const A = Math.max(0.1, params.amplitude ?? 1);
  const f = Math.max(0.1, params.frequency ?? 1);
  const phiDeg = params.phase ?? 0;
  const phi = (phiDeg * Math.PI) / 180;

  const tMax = 4; // seconds of display
  const pts: string[] = [];
  for (let i = 0; i <= POINTS; i++) {
    const t = (i / POINTS) * tMax;
    const x = (i / POINTS) * W;
    const y = CY - A * AMP_SCALE * Math.cos(2 * Math.PI * f * t + phi);
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const d = pts.join(" ");

  const ampY = CY - A * AMP_SCALE;
  const negAmpY = CY + A * AMP_SCALE;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block" }}>
      {/* Equilibrium line */}
      <line x1={0} y1={CY} x2={W} y2={CY} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
      {/* ±A guidelines */}
      <line x1={0} y1={ampY} x2={W} y2={ampY} stroke="rgba(255,200,100,0.15)" strokeWidth={1} strokeDasharray="4,4" />
      <line x1={0} y1={negAmpY} x2={W} y2={negAmpY} stroke="rgba(255,200,100,0.15)" strokeWidth={1} strokeDasharray="4,4" />
      <text x={4} y={ampY - 4} fontSize="9" fill="rgba(255,200,100,0.5)">+A={A.toFixed(1)}</text>
      <text x={4} y={negAmpY + 12} fontSize="9" fill="rgba(255,200,100,0.5)">-A</text>

      {/* Time axis labels */}
      {[0, 1, 2, 3, 4].map((t) => (
        <g key={t}>
          <line
            x1={(t / tMax) * W} y1={CY - 4}
            x2={(t / tMax) * W} y2={CY + 4}
            stroke="rgba(255,255,255,0.2)" strokeWidth={1}
          />
          <text
            x={(t / tMax) * W} y={CY + 16}
            fontSize="9" fill="rgba(255,255,255,0.3)" textAnchor="middle"
          >
            {t}s
          </text>
        </g>
      ))}

      {/* Wave */}
      <path d={d} fill="none" stroke="rgba(100,180,255,0.85)" strokeWidth={2} />

      {/* Labels */}
      <text x={12} y={14} fontSize="9" fill="rgba(255,255,255,0.35)">
        f={f.toFixed(1)} Hz  T={f > 0 ? (1 / f).toFixed(2) : "∞"}s  φ={phiDeg.toFixed(0)}°
      </text>
    </svg>
  );
}
