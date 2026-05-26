"use client";

import type { DiagramProps } from "@/types";

const W = 600;
const H = 300;

export default function InclinedPlane({ params, labels }: DiagramProps) {
  const angleDeg = Math.min(80, Math.max(5, params?.angle ?? 30));
  const theta = (angleDeg * Math.PI) / 180;

  // Triangle vertices: base-left, base-right, apex
  const bx = 80;
  const by = 250;
  const ex = 500;
  const ey = 250;
  const apex_x = bx;
  const apex_y = by - (ex - bx) * Math.tan(theta);

  // Block sits partway up the slope (60% along)
  const t = 0.55;
  const slope_len = Math.sqrt((ex - bx) ** 2 + (by - apex_y) ** 2);
  const slope_dx = (ex - apex_x) / slope_len;
  const slope_dy = (ey - apex_y) / slope_len;
  const blk_cx = apex_x + t * slope_len * slope_dx;
  const blk_cy = apex_y + t * slope_len * slope_dy;

  // Block size
  const bw = 32;
  const bh = 22;

  // Rotate block to sit on slope
  const rotDeg = -angleDeg;

  // Gravity parallel (down-slope direction = +slope direction)
  const gParLen = 52;
  const gpx = slope_dx * gParLen;
  const gpy = slope_dy * gParLen;

  // Gravity perpendicular (into surface)
  const perpDx = -slope_dy; // normal to slope, pointing "into" surface
  const perpDy = slope_dx;
  const gPerpLen = 44;
  const gppx = perpDx * gPerpLen;
  const gppy = perpDy * gPerpLen;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block" }}>
      <defs>
        <marker id="ip-arr-r" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="rgba(255,120,80,0.85)" />
        </marker>
        <marker id="ip-arr-b" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="rgba(100,180,255,0.85)" />
        </marker>
      </defs>

      {/* Triangle */}
      <polygon
        points={`${bx},${by} ${ex},${ey} ${apex_x},${apex_y}`}
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth={1.5}
      />

      {/* Angle arc */}
      {(() => {
        const arcR = 28;
        const ax2 = ex - arcR;
        const ay2 = ey;
        const ax3x = ex - arcR * Math.cos(theta);
        const ax3y = ey - arcR * Math.sin(theta);
        return (
          <>
            <path
              d={`M ${ax2} ${ay2} A ${arcR} ${arcR} 0 0 0 ${ax3x.toFixed(2)} ${ax3y.toFixed(2)}`}
              fill="none" stroke="rgba(255,200,100,0.6)" strokeWidth={1.5}
            />
            <text
              x={ex - arcR - 22}
              y={ey - 10}
              fontSize="12" fill="rgba(255,200,100,0.8)"
            >
              {labels?.theta ?? "θ"}={angleDeg}°
            </text>
          </>
        );
      })()}

      {/* Block (rotated rectangle) */}
      <rect
        x={blk_cx - bw / 2}
        y={blk_cy - bh / 2}
        width={bw}
        height={bh}
        fill="rgba(255,255,255,0.1)"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth={1.5}
        rx={2}
        transform={`rotate(${rotDeg}, ${blk_cx}, ${blk_cy})`}
      />

      {/* Gravity-parallel arrow (down the slope) */}
      <line
        x1={blk_cx} y1={blk_cy}
        x2={blk_cx + gpx} y2={blk_cy + gpy}
        stroke="rgba(255,120,80,0.85)" strokeWidth={2}
        markerEnd="url(#ip-arr-r)"
      />
      <text
        x={blk_cx + gpx + 3}
        y={blk_cy + gpy + 4}
        fontSize="9" fill="rgba(255,120,80,0.75)"
      >
        {labels?.g_par ?? "mg·sin θ"}
      </text>

      {/* Gravity-perpendicular arrow (into surface) */}
      <line
        x1={blk_cx} y1={blk_cy}
        x2={blk_cx + gppx} y2={blk_cy + gppy}
        stroke="rgba(100,180,255,0.85)" strokeWidth={2}
        markerEnd="url(#ip-arr-b)"
      />
      <text
        x={blk_cx + gppx + 3}
        y={blk_cy + gppy + 4}
        fontSize="9" fill="rgba(100,180,255,0.75)"
      >
        {labels?.g_perp ?? "mg·cos θ"}
      </text>

      {/* Title */}
      <text x={W / 2} y={H - 6} fontSize="10" fill="rgba(255,255,255,0.2)" textAnchor="middle">Inclined Plane</text>
    </svg>
  );
}
