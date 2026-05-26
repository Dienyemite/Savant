"use client";

import type { VisualizerProps } from "@/types";

const G = 9.8;
const W = 600;
const H = 300;
const OX = 40; // origin x
const OY = 260; // origin y

export default function ProjectileMotion({ params, outputLabel }: VisualizerProps) {
  const v0 = Math.max(1, params.velocity ?? 20);
  const deg = Math.min(85, Math.max(5, params.angle ?? 45));
  const theta = (deg * Math.PI) / 180;

  const T = (2 * v0 * Math.sin(theta)) / G;
  const R = (v0 * v0 * Math.sin(2 * theta)) / G;
  const Hmax = (v0 * v0 * Math.sin(theta) * Math.sin(theta)) / (2 * G);

  // Scale to fit SVG
  const scaleX = (W - OX - 20) / Math.max(R, 0.1);
  const scaleY = (OY - 20) / Math.max(Hmax, 0.1);

  // Build parabola path — 60 points
  const N = 60;
  const points: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * T;
    const px = v0 * Math.cos(theta) * t;
    const py = v0 * Math.sin(theta) * t - 0.5 * G * t * t;
    const svgX = OX + px * scaleX;
    const svgY = OY - py * scaleY;
    points.push([svgX, svgY]);
  }

  const d = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  // Launch arrow
  const arrowLen = 28;
  const ax = OX + arrowLen * Math.cos(theta);
  const ay = OY - arrowLen * Math.sin(theta);

  // Range label x
  const rangeLabelX = OX + R * scaleX;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block" }}>
      {/* Ground */}
      <line x1={OX - 4} y1={OY} x2={W - 10} y2={OY} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
      {/* Axes tick at origin */}
      <circle cx={OX} cy={OY} r={3} fill="rgba(255,255,255,0.5)" />

      {/* Parabola */}
      <path d={d} fill="none" stroke="rgba(100,180,255,0.8)" strokeWidth={2} strokeLinecap="round" />

      {/* Launch arrow */}
      <line
        x1={OX} y1={OY}
        x2={ax} y2={ay}
        stroke="rgba(255,200,100,0.8)" strokeWidth={2}
        markerEnd="url(#arrowhead)"
      />
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="rgba(255,200,100,0.8)" />
        </marker>
      </defs>

      {/* Angle label */}
      <text x={OX + 18} y={OY - 6} fontSize="10" fill="rgba(255,200,100,0.7)">{deg}°</text>

      {/* Height dashed line */}
      {Hmax > 0.1 && (
        <>
          <line
            x1={OX + (R / 2) * scaleX} y1={OY - Hmax * scaleY}
            x2={OX + (R / 2) * scaleX} y2={OY}
            stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="3,3"
          />
          <text
            x={OX + (R / 2) * scaleX + 4} y={OY - Hmax * scaleY / 2}
            fontSize="10" fill="rgba(255,255,255,0.45)"
          >
            H={Hmax.toFixed(1)}m
          </text>
        </>
      )}

      {/* Range label */}
      <text
        x={Math.min(rangeLabelX - 2, W - 60)} y={OY + 14}
        fontSize="10" fill="rgba(100,220,140,0.8)" textAnchor="middle"
      >
        R={R.toFixed(1)} m
      </text>

      {/* T label */}
      <text x={W - 12} y={16} fontSize="10" fill="rgba(255,255,255,0.35)" textAnchor="end">
        T={T.toFixed(2)}s
      </text>

      {/* Output label */}
      {outputLabel && (
        <text x={12} y={16} fontSize="10" fill="rgba(100,180,255,0.6)">
          {outputLabel}: {R.toFixed(1)} m
        </text>
      )}
    </svg>
  );
}
