"use client";

import type { DiagramProps } from "@/types";

const W = 600;
const H = 300;
const CX = W / 2;
const CY = H / 2;
const DISPLAY_R = 110;

export default function CircleWithAngle({ params, labels }: DiagramProps) {
  const angleDeg = Math.min(359, Math.max(5, params?.angle ?? 60));
  const angleRad = (angleDeg * Math.PI) / 180;
  const radius = params?.radius ?? 1;
  const arcLength = (radius * angleDeg * Math.PI) / 180;

  // Point on circumference at the given angle (from positive x axis)
  const px = CX + DISPLAY_R * Math.cos(angleRad);
  const py = CY - DISPLAY_R * Math.sin(angleRad); // SVG y flips

  // Arc path from 0 to angle
  const largeArc = angleDeg > 180 ? 1 : 0;
  const arcD = [
    `M ${CX + DISPLAY_R} ${CY}`,
    `A ${DISPLAY_R} ${DISPLAY_R} 0 ${largeArc} 0 ${px.toFixed(2)} ${py.toFixed(2)}`,
  ].join(" ");

  // Small arc for angle indicator
  const arcSmallR = 28;
  const arcSmallX = CX + arcSmallR * Math.cos(angleRad);
  const arcSmallY = CY - arcSmallR * Math.sin(angleRad);
  const arcSmallD = `M ${CX + arcSmallR} ${CY} A ${arcSmallR} ${arcSmallR} 0 ${largeArc} 0 ${arcSmallX.toFixed(2)} ${arcSmallY.toFixed(2)}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block" }}>
      {/* Full circle (outline only) */}
      <circle cx={CX} cy={CY} r={DISPLAY_R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} strokeDasharray="5,4" />

      {/* Arc */}
      <path d={arcD} fill="none" stroke="rgba(100,180,255,0.7)" strokeWidth={2.5} />

      {/* Radius line to arc end */}
      <line x1={CX} y1={CY} x2={px} y2={py} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} />
      {/* Radius line along x axis */}
      <line x1={CX} y1={CY} x2={CX + DISPLAY_R} y2={CY} stroke="rgba(255,255,255,0.25)" strokeWidth={1} strokeDasharray="4,3" />

      {/* Center */}
      <circle cx={CX} cy={CY} r={3} fill="rgba(255,255,255,0.4)" />

      {/* Point on circle */}
      <circle cx={px} cy={py} r={5} fill="rgba(100,180,255,0.5)" stroke="rgba(100,180,255,0.85)" strokeWidth={1.5} />

      {/* Angle arc indicator */}
      <path d={arcSmallD} fill="none" stroke="rgba(255,200,100,0.6)" strokeWidth={1.5} />

      {/* Labels */}
      {/* θ label */}
      <text
        x={CX + (arcSmallR + 12) * Math.cos(angleRad / 2)}
        y={CY - (arcSmallR + 12) * Math.sin(angleRad / 2) + 4}
        fontSize="12" fill="rgba(255,200,100,0.8)" textAnchor="middle"
      >
        {labels?.theta ?? "θ"}
      </text>

      {/* r label — midpoint of radius */}
      <text
        x={(CX + px) / 2 + 6}
        y={(CY + py) / 2 - 6}
        fontSize="11" fill="rgba(255,255,255,0.5)"
      >
        {labels?.r ?? "r"}
      </text>

      {/* s label — midpoint of arc */}
      {angleDeg <= 180 && (
        <text
          x={CX + (DISPLAY_R + 18) * Math.cos(angleRad / 2)}
          y={CY - (DISPLAY_R + 18) * Math.sin(angleRad / 2) + 4}
          fontSize="11" fill="rgba(100,180,255,0.7)"
        >
          {labels?.s ?? "s"}
        </text>
      )}

      {/* Info */}
      <text x={10} y={H - 22} fontSize="10" fill="rgba(255,255,255,0.35)">r = {radius}</text>
      <text x={10} y={H - 9} fontSize="10" fill="rgba(255,255,255,0.35)">θ = {angleDeg}°  s = rθ = {arcLength.toFixed(2)}</text>
    </svg>
  );
}
