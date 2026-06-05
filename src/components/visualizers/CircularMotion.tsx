"use client";

import { useEffect, useRef, useState } from "react";
import type { VisualizerProps } from "@/types";

// SVG viewport
const W  = 600;
const H  = 300;
const CX = 210;  // orbit centre x — shifted left to give room for info panel
const CY = 150;  // orbit centre y

// Accept common aliases for param IDs produced by the AI lesson generator.
// Falls back to positional order (first param = radius, second = speed) so
// ANY two-param circular_motion block responds to slider changes.
function resolveRadius(p: Record<string, number>): number {
  const vals = Object.values(p);
  const raw  = p.radius ?? p.r ?? p.distance_from_axis ?? p.distance ?? p.dist ?? vals[0] ?? 50;
  return Math.min(100, Math.max(10, raw));
}
function resolveSpeed(p: Record<string, number>): number {
  const vals = Object.values(p);
  const raw  = p.speed ?? p.v ?? p.omega ?? p.angular_velocity ?? p.velocity ?? vals[1] ?? vals[0] ?? 10;
  return Math.max(0.1, raw);
}

/**
 * Clockwise SVG arc from angle a0 → a1 on circle (cx, cy, r).
 * sweep-flag 1 = clockwise in SVG coordinate space (y-axis points down),
 * which matches the direction of positive-angle rotation used here.
 */
function sweepArc(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const sx   = (cx + r * Math.cos(a0)).toFixed(2);
  const sy   = (cy + r * Math.sin(a0)).toFixed(2);
  const ex   = (cx + r * Math.cos(a1)).toFixed(2);
  const ey   = (cy + r * Math.sin(a1)).toFixed(2);
  const span = ((((a1 - a0) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI));
  const big  = span > Math.PI ? 1 : 0;
  const rs   = r.toFixed(2);
  return `M ${sx} ${sy} A ${rs} ${rs} 0 ${big} 1 ${ex} ${ey}`;
}

export default function CircularMotion({ params }: VisualizerProps) {
  const radius = resolveRadius(params as Record<string, number>);
  const speed  = resolveSpeed(params as Record<string, number>);

  // Persistent angle so position is continuous across slider changes.
  const angleRef = useRef(0);
  const [angle, setAngle] = useState(0);

  // ω changes immediately when either slider moves — the effect re-runs.
  const omega = speed / radius; // rad/s

  useEffect(() => {
    let rafId: number;
    let prev: number | null = null;

    const tick = (ts: number) => {
      if (prev === null) prev = ts;
      const dt = Math.min((ts - prev) / 1000, 0.05); // cap at 50 ms to avoid jump on tab-blur
      prev = ts;
      angleRef.current += omega * dt;
      setAngle(angleRef.current);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [omega]); // re-runs whenever radius or speed changes

  // ── Derived quantities ──────────────────────────────────────────────────

  // Display radius: maps params [10, 100] m → [22, 108] px
  const dispR  = ((radius - 10) / 90) * 86 + 22;
  const ac     = (speed * speed) / radius;         // centripetal acceleration m/s²
  const period = (2 * Math.PI * radius) / speed;  // orbital period s

  const a  = angle;
  const ox = CX + dispR * Math.cos(a);
  const oy = CY + dispR * Math.sin(a);

  // Velocity vector: tangent direction for clockwise motion = (-sin a, +cos a)
  const vLen  = Math.max(20, Math.min(70, speed * 2.5));
  const vDirX = -Math.sin(a);
  const vDirY =  Math.cos(a);

  // Centripetal vector: toward centre = (-cos a, -sin a)
  // Capped at (dispR - 8) so the arrowhead never overshoots the centre.
  const cpLen  = Math.max(12, Math.min(dispR - 8, 58, ac * 2.5 + 10));
  const cpDirX = -Math.cos(a);
  const cpDirY = -Math.sin(a);

  // Velocity label: just beyond arrow tip
  const vLabelX = ox + vDirX * (vLen + 11);
  const vLabelY = oy + vDirY * (vLen + 11);

  // Centripetal label: at mid-arrow, offset sideways in velocity direction
  // so it never sits on top of the radius line or centre marker.
  const acLabelX = ox + cpDirX * (cpLen * 0.45) + vDirX * 13;
  const acLabelY = oy + cpDirY * (cpLen * 0.45) + vDirY * 13;

  // Trail arc: last 120° (2π/3 radians) of the orbit
  const trail = sweepArc(CX, CY, dispR, a - (2 * Math.PI) / 3, a);

  const MONO = { fontFamily: "'Courier New', monospace" } as const;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block" }}>
      <defs>
        <marker id="cm-v-tip"  markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="rgba(100,180,255,0.90)" />
        </marker>
        <marker id="cm-ac-tip" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="rgba(255,130,80,0.90)" />
        </marker>
      </defs>

      {/* ── Full orbit ghost (dashed) ── */}
      <circle
        cx={CX} cy={CY} r={dispR}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={1.5}
        strokeDasharray="4,5"
      />

      {/* ── Recent path trail (last 120°) ── */}
      <path
        d={trail}
        fill="none"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth={2}
        strokeLinecap="round"
      />

      {/* ── Centre marker ── */}
      <line x1={CX - 7} y1={CY} x2={CX + 7} y2={CY} stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
      <line x1={CX} y1={CY - 7} x2={CX} y2={CY + 7} stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
      <circle cx={CX} cy={CY} r={2.5} fill="rgba(255,255,255,0.45)" />

      {/* ── Radius line ── */}
      <line
        x1={CX} y1={CY} x2={ox} y2={oy}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={1}
        strokeDasharray="3,4"
      />

      {/* ── Moving object ── */}
      <circle
        cx={ox} cy={oy} r={9}
        fill="rgba(255,255,255,0.10)"
        stroke="rgba(255,255,255,0.80)"
        strokeWidth={2}
      />

      {/* ── Velocity arrow (blue, tangent to orbit) ── */}
      <line
        x1={ox} y1={oy}
        x2={ox + vDirX * vLen} y2={oy + vDirY * vLen}
        stroke="rgba(100,180,255,0.90)"
        strokeWidth={2.5}
        markerEnd="url(#cm-v-tip)"
      />
      <text
        x={vLabelX} y={vLabelY}
        fontSize="10" fill="rgba(100,180,255,0.85)"
        textAnchor="middle" dominantBaseline="middle"
      >v</text>

      {/* ── Centripetal arrow (orange, toward centre) ── */}
      <line
        x1={ox} y1={oy}
        x2={ox + cpDirX * cpLen} y2={oy + cpDirY * cpLen}
        stroke="rgba(255,130,80,0.90)"
        strokeWidth={2.5}
        markerEnd="url(#cm-ac-tip)"
      />
      <text
        x={acLabelX} y={acLabelY}
        fontSize="10" fill="rgba(255,130,80,0.85)"
        textAnchor="middle" dominantBaseline="middle"
      >aᵢ</text>

      {/* ── Panel divider ── */}
      <line
        x1={392} y1={22} x2={392} y2={H - 22}
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={1}
      />

      {/* ── Info panel ─────────────────────────────────────────────────────── */}

      {/* Header */}
      <text
        x={408} y={38}
        fontSize="7" letterSpacing="2.5"
        fill="rgba(255,255,255,0.20)"
        style={MONO}
      >CIRCULAR MOTION</text>

      {/* r — radius */}
      <text x={408} y={64}  fontSize="10" fill="rgba(255,255,255,0.38)">r</text>
      <text x={424} y={64}  fontSize="10" fill="rgba(255,255,255,0.72)" style={MONO}>{radius.toFixed(0)} m</text>

      {/* v — speed (blue, matches arrow) */}
      <text x={408} y={86}  fontSize="10" fill="rgba(100,180,255,0.72)">v</text>
      <text x={424} y={86}  fontSize="10" fill="rgba(100,180,255,0.95)" style={MONO}>{speed.toFixed(1)} m/s</text>

      {/* ω — angular velocity */}
      <text x={408} y={108} fontSize="10" fill="rgba(255,255,255,0.38)">ω</text>
      <text x={424} y={108} fontSize="10" fill="rgba(255,255,255,0.65)" style={MONO}>{omega.toFixed(2)} rad/s</text>

      {/* T — period (green) */}
      <text x={408} y={130} fontSize="10" fill="rgba(160,255,140,0.68)">T</text>
      <text x={424} y={130} fontSize="10" fill="rgba(160,255,140,0.90)" style={MONO}>{period.toFixed(2)} s</text>

      {/* aᵢ — centripetal acceleration (orange, matches arrow) */}
      <text x={408} y={152} fontSize="10" fill="rgba(255,130,80,0.72)">aᵢ</text>
      <text x={428} y={152} fontSize="10" fill="rgba(255,130,80,0.95)" style={MONO}>{ac.toFixed(2)} m/s²</text>

      {/* ── Formula reference ── */}
      <line x1={408} y1={167} x2={588} y2={167} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      <text x={408} y={182} fontSize="8" fill="rgba(255,255,255,0.18)" style={MONO}>aᵢ = v² / r</text>
      <text x={408} y={196} fontSize="8" fill="rgba(255,255,255,0.18)" style={MONO}>T = 2πr / v</text>
      <text x={408} y={210} fontSize="8" fill="rgba(255,255,255,0.18)" style={MONO}>ω = v / r</text>

      {/* ── Legend ── */}
      <line x1={408} y1={238} x2={422} y2={238} stroke="rgba(100,180,255,0.68)" strokeWidth={2} />
      <text x={426} y={242} fontSize="8" fill="rgba(255,255,255,0.32)">velocity (v)</text>
      <line x1={408} y1={253} x2={422} y2={253} stroke="rgba(255,130,80,0.68)" strokeWidth={2} />
      <text x={426} y={257} fontSize="8" fill="rgba(255,255,255,0.32)">centripetal accel. (aᵢ)</text>
      <line x1={408} y1={268} x2={422} y2={268} stroke="rgba(255,255,255,0.28)" strokeWidth={2} />
      <text x={426} y={272} fontSize="8" fill="rgba(255,255,255,0.32)">recent path</text>
    </svg>
  );
}
