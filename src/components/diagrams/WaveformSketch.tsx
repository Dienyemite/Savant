"use client";

import type { DiagramProps } from "@/types";

const W = 600;
const H = 300;
const CY = H / 2;
const AMP = 80; // px
const CYCLES = 2;
const POINTS = 200;

export default function WaveformSketch({ params, labels }: DiagramProps) {
  const amplitude = params?.amplitude ?? 1;
  const frequency = params?.frequency ?? 1;
  const ampPx = AMP * Math.min(1.5, amplitude);

  const pts: string[] = [];
  for (let i = 0; i <= POINTS; i++) {
    const x = (i / POINTS) * W;
    const t = (i / POINTS) * CYCLES * 2 * Math.PI * frequency;
    const y = CY - ampPx * Math.sin(t);
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const d = pts.join(" ");

  // Wavelength span — 1 full cycle across the SVG width / CYCLES
  const lambdaX0 = 0;
  const lambdaX1 = W / CYCLES;

  // Nodes — zero crossings at quarter-cycle intervals
  const nodeXs: number[] = [];
  for (let k = 0; k <= CYCLES * 2; k++) {
    nodeXs.push((k / (CYCLES * 2)) * W);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block" }}>
      {/* Centre axis */}
      <line x1={0} y1={CY} x2={W} y2={CY} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />

      {/* Wave */}
      <path d={d} fill="none" stroke="rgba(100,180,255,0.85)" strokeWidth={2.5} strokeLinecap="round" />

      {/* Amplitude arrow (left side) */}
      <line x1={20} y1={CY} x2={20} y2={CY - ampPx} stroke="rgba(255,200,100,0.5)" strokeWidth={1} strokeDasharray="3,3" />
      <line x1={16} y1={CY - ampPx} x2={24} y2={CY - ampPx} stroke="rgba(255,200,100,0.5)" strokeWidth={1} />
      <text x={26} y={CY - ampPx / 2} fontSize="10" fill="rgba(255,200,100,0.7)">{labels?.A ?? "A"}</text>

      {/* Wavelength annotation */}
      <line x1={lambdaX0 + 2} y1={CY + ampPx + 18} x2={lambdaX1 - 2} y2={CY + ampPx + 18}
        stroke="rgba(100,220,140,0.5)" strokeWidth={1} markerEnd="url(#wave-arr)" markerStart="url(#wave-arr-s)" />
      <defs>
        <marker id="wave-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="rgba(100,220,140,0.6)" />
        </marker>
        <marker id="wave-arr-s" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto-start-reverse">
          <path d="M0,0 L0,6 L6,3 z" fill="rgba(100,220,140,0.6)" />
        </marker>
      </defs>
      <text x={(lambdaX0 + lambdaX1) / 2} y={CY + ampPx + 32} fontSize="10" fill="rgba(100,220,140,0.7)" textAnchor="middle">
        {labels?.lambda ?? "λ"}
      </text>

      {/* Node markers */}
      {nodeXs.map((nx, i) => (
        <g key={i}>
          <circle cx={nx} cy={CY} r={3} fill="rgba(255,255,255,0.25)" />
          {i < nodeXs.length - 1 && (
            <text x={nx + 3} y={CY - 6} fontSize="8" fill="rgba(255,255,255,0.25)">
              {labels?.node ?? "node"}
            </text>
          )}
        </g>
      ))}

      {/* Title */}
      <text x={W / 2} y={H - 6} fontSize="10" fill="rgba(255,255,255,0.2)" textAnchor="middle">Transverse Wave</text>
    </svg>
  );
}
