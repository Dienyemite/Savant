"use client";

import type { DiagramProps } from "@/types";

const W = 600;
const H = 300;
const BOX_X = 240;
const BOX_Y = 120;
const BOX_W = 120;
const BOX_H = 60;
const BOX_CX = BOX_X + BOX_W / 2;
const BOX_CY = BOX_Y + BOX_H / 2;
const ARROW_LEN = 70;

export default function FreeBodyDiagram({ labels }: DiagramProps) {
  const lW = labels?.weight ?? "W = mg";
  const lN = labels?.normal ?? "N";
  const lF = labels?.friction ?? "f";
  const lA = labels?.applied ?? "F";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block" }}>
      <defs>
        <marker id="fbd-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L0,7 L7,3.5 z" fill="rgba(255,255,255,0.65)" />
        </marker>
        <marker id="fbd-arr-b" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L0,7 L7,3.5 z" fill="rgba(100,180,255,0.75)" />
        </marker>
        <marker id="fbd-arr-r" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L0,7 L7,3.5 z" fill="rgba(255,120,80,0.75)" />
        </marker>
        <marker id="fbd-arr-g" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L0,7 L7,3.5 z" fill="rgba(100,220,140,0.75)" />
        </marker>
      </defs>

      {/* Ground surface */}
      <line x1={BOX_X - 30} y1={BOX_Y + BOX_H} x2={BOX_X + BOX_W + 30} y2={BOX_Y + BOX_H} stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />

      {/* Box */}
      <rect x={BOX_X} y={BOX_Y} width={BOX_W} height={BOX_H}
        fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} rx={3}
      />

      {/* Weight — downward from center */}
      <line x1={BOX_CX} y1={BOX_CY} x2={BOX_CX} y2={BOX_CY + ARROW_LEN}
        stroke="rgba(255,120,80,0.8)" strokeWidth={2} markerEnd="url(#fbd-arr-r)" />
      <text x={BOX_CX + 6} y={BOX_CY + ARROW_LEN + 2} fontSize="11" fill="rgba(255,120,80,0.8)">{lW}</text>

      {/* Normal — upward from top */}
      <line x1={BOX_CX} y1={BOX_Y} x2={BOX_CX} y2={BOX_Y - ARROW_LEN}
        stroke="rgba(100,180,255,0.8)" strokeWidth={2} markerEnd="url(#fbd-arr-b)" />
      <text x={BOX_CX + 6} y={BOX_Y - ARROW_LEN - 4} fontSize="11" fill="rgba(100,180,255,0.8)">{lN}</text>

      {/* Friction — leftward from center */}
      <line x1={BOX_X} y1={BOX_CY} x2={BOX_X - ARROW_LEN} y2={BOX_CY}
        stroke="rgba(255,200,100,0.8)" strokeWidth={2} markerEnd="url(#fbd-arrow)" />
      <text x={BOX_X - ARROW_LEN - 20} y={BOX_CY + 4} fontSize="11" fill="rgba(255,200,100,0.8)">{lF}</text>

      {/* Applied — rightward from center */}
      <line x1={BOX_X + BOX_W} y1={BOX_CY} x2={BOX_X + BOX_W + ARROW_LEN} y2={BOX_CY}
        stroke="rgba(100,220,140,0.8)" strokeWidth={2} markerEnd="url(#fbd-arr-g)" />
      <text x={BOX_X + BOX_W + ARROW_LEN + 5} y={BOX_CY + 4} fontSize="11" fill="rgba(100,220,140,0.8)">{lA}</text>

      {/* Title */}
      <text x={W / 2} y={H - 10} fontSize="10" fill="rgba(255,255,255,0.25)" textAnchor="middle">Free Body Diagram</text>
    </svg>
  );
}
