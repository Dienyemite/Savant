"use client";

import type { VisualizerProps } from "@/types";

const W = 600;
const H = 300;
const CX = 300;
const CY = 155;

export default function CircularMotion({ params }: VisualizerProps) {
  const radius = Math.min(100, Math.max(10, params.radius ?? 50));
  const speed = Math.max(0.1, params.speed ?? 10);

  // Scale circle to fit in SVG (max display radius ~120px)
  const dispR = (radius / 100) * 120 + 20;
  const ac = (speed * speed) / radius;

  // Object at top of circle (angle 0 = 3 o'clock, we show at 12 = -90°)
  const angle = -Math.PI / 2; // top
  const objX = CX + dispR * Math.cos(angle);
  const objY = CY + dispR * Math.sin(angle);

  // Velocity tangent (perpendicular to radius, pointing right for top position)
  const vLen = 40;
  const vx = vLen * (-Math.sin(angle)); // tangent x
  const vy = vLen * (Math.cos(angle));  // tangent y

  // Centripetal toward center
  const cpLen = 36;
  const cpx = cpLen * (-Math.cos(angle));
  const cpy = cpLen * (-Math.sin(angle));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block" }}>
      <defs>
        <marker id="v-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="rgba(100,180,255,0.85)" />
        </marker>
        <marker id="cp-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="rgba(255,120,80,0.85)" />
        </marker>
      </defs>

      {/* Circle path */}
      <circle cx={CX} cy={CY} r={dispR} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} strokeDasharray="5,4" />
      {/* Center dot */}
      <circle cx={CX} cy={CY} r={3} fill="rgba(255,255,255,0.3)" />

      {/* Radius line */}
      <line x1={CX} y1={CY} x2={objX} y2={objY} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />

      {/* Object */}
      <circle cx={objX} cy={objY} r={8} fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} />

      {/* Velocity arrow */}
      <line
        x1={objX} y1={objY}
        x2={objX + vx} y2={objY + vy}
        stroke="rgba(100,180,255,0.85)" strokeWidth={2}
        markerEnd="url(#v-arrow)"
      />
      <text x={objX + vx + 4} y={objY + vy + 4} fontSize="9" fill="rgba(100,180,255,0.7)">v</text>

      {/* Centripetal arrow */}
      <line
        x1={objX} y1={objY}
        x2={objX + cpx} y2={objY + cpy}
        stroke="rgba(255,120,80,0.85)" strokeWidth={2}
        markerEnd="url(#cp-arrow)"
      />
      <text x={objX + cpx - 14} y={objY + cpy - 4} fontSize="9" fill="rgba(255,120,80,0.7)">aᵢ</text>

      {/* Info panel */}
      <rect x={10} y={10} width={180} height={65} rx={6} fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
      <text x={18} y={28} fontSize="10" fill="rgba(255,255,255,0.6)">r = {radius} m</text>
      <text x={18} y={44} fontSize="10" fill="rgba(100,180,255,0.7)">v = {speed.toFixed(1)} m/s</text>
      <text x={18} y={60} fontSize="10" fill="rgba(255,120,80,0.7)">aᵢ = v²/r = {ac.toFixed(2)} m/s²</text>

      {/* Legend */}
      <line x1={10} y1={H - 30} x2={28} y2={H - 30} stroke="rgba(100,180,255,0.7)" strokeWidth={2} />
      <text x={34} y={H - 26} fontSize="9" fill="rgba(255,255,255,0.4)">velocity</text>
      <line x1={90} y1={H - 30} x2={108} y2={H - 30} stroke="rgba(255,120,80,0.7)" strokeWidth={2} />
      <text x={114} y={H - 26} fontSize="9" fill="rgba(255,255,255,0.4)">centripetal accel.</text>
    </svg>
  );
}
