"use client";

import type { DiagramProps } from "@/types";

const G = 9.8;
const W = 600;
const H = 300;
const OX = 40;
const OY = 260;

export default function ParabolaArc({ params, labels }: DiagramProps) {
  const v0 = 20;
  const deg = params?.angle ?? 45;
  const theta = (deg * Math.PI) / 180;

  const T = (2 * v0 * Math.sin(theta)) / G;
  const R = (v0 * v0 * Math.sin(2 * theta)) / G;
  const Hmax = (v0 * v0 * Math.sin(theta) * Math.sin(theta)) / (2 * G);

  const scaleX = (W - OX - 30) / Math.max(R, 0.1);
  const scaleY = (OY - 30) / Math.max(Hmax, 0.1);

  const N = 60;
  const pts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * T;
    const x = OX + v0 * Math.cos(theta) * t * scaleX;
    const y = OY - (v0 * Math.sin(theta) * t - 0.5 * G * t * t) * scaleY;
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const d = pts.join(" ");

  const apexX = OX + (R / 2) * scaleX;
  const apexY = OY - Hmax * scaleY;
  const landX = OX + R * scaleX;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block" }}>
      {/* Ground */}
      <line x1={OX - 6} y1={OY} x2={W - 10} y2={OY} stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} />
      {/* Origin */}
      <circle cx={OX} cy={OY} r={3} fill="rgba(255,255,255,0.5)" />

      {/* Height dashed */}
      <line x1={apexX} y1={apexY} x2={apexX} y2={OY} stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="4,3" />
      {/* Range arrow */}
      <line x1={OX} y1={OY + 18} x2={landX} y2={OY + 18} stroke="rgba(100,220,140,0.5)" strokeWidth={1.5} markerEnd="url(#end-r)" markerStart="url(#start-r)" />

      <defs>
        <marker id="end-r" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="rgba(100,220,140,0.6)" />
        </marker>
        <marker id="start-r" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto-start-reverse">
          <path d="M0,0 L0,6 L6,3 z" fill="rgba(100,220,140,0.6)" />
        </marker>
      </defs>

      {/* Arc */}
      <path d={d} fill="none" stroke="rgba(100,180,255,0.85)" strokeWidth={2.5} strokeLinecap="round" />

      {/* Labels */}
      <text x={apexX + 4} y={apexY - 6} fontSize="10" fill="rgba(255,200,100,0.7)">{labels?.H ?? `H=${Hmax.toFixed(1)}m`}</text>
      <text x={(OX + landX) / 2} y={OY + 32} fontSize="10" fill="rgba(100,220,140,0.7)" textAnchor="middle">{labels?.R ?? `R=${R.toFixed(1)}m`}</text>
      <text x={OX + 12} y={OY - 8} fontSize="10" fill="rgba(255,200,100,0.6)">{deg}°</text>
      <text x={landX} y={OY - 6} fontSize="10" fill="rgba(255,255,255,0.4)" textAnchor="middle">Landing</text>
    </svg>
  );
}
