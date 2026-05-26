"use client";

import { useMemo, useState } from "react";
import type { TimelineBlock } from "@/types";

const CATEGORY_COLORS: Record<string, string> = {
  political: "#60a5fa",
  violence: "#f87171",
  social: "#a78bfa",
  economic: "#34d399",
  science: "#fbbf24",
  culture: "#f472b6",
  military: "#fb923c",
};

function categoryColor(cat?: string): string {
  if (!cat) return "#ffffff80";
  return CATEGORY_COLORS[cat.toLowerCase()] ?? "#ffffff80";
}

export default function TimelineRenderer({ block }: { block: TimelineBlock }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const events = useMemo(
    () => [...block.events].sort((a, b) => a.year - b.year),
    [block.events]
  );

  const selectedEvent = events.find((e) => e.id === selectedId) ?? null;

  // SVG dimensions
  const svgWidth = 560;
  const svgHeight = 80;
  const markerY = 40;
  const r = 7;
  const padding = 24;
  const usableWidth = svgWidth - padding * 2;
  const minYear = events[0]?.year ?? 0;
  const maxYear = events[events.length - 1]?.year ?? 1;
  const yearSpan = maxYear - minYear || 1;

  function xForYear(year: number) {
    return padding + ((year - minYear) / yearSpan) * usableWidth;
  }

  return (
    <div className="border border-white/20 rounded-xl p-5 bg-black/60 space-y-4">
      <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">Timeline</div>
      {block.title && <h3 className="text-base font-semibold text-white/80">{block.title}</h3>}

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width="100%"
          style={{ minWidth: 320, display: "block" }}
        >
          {/* Base line */}
          <line
            x1={padding}
            y1={markerY}
            x2={svgWidth - padding}
            y2={markerY}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1.5}
          />
          {events.map((ev) => {
            const cx = xForYear(ev.year);
            const color = categoryColor(ev.category);
            const isSelected = selectedId === ev.id;
            return (
              <g
                key={ev.id}
                onClick={() => setSelectedId(isSelected ? null : ev.id)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={cx}
                  cy={markerY}
                  r={isSelected ? r + 2 : r}
                  fill={color}
                  fillOpacity={isSelected ? 1 : 0.7}
                  stroke={isSelected ? "white" : "transparent"}
                  strokeWidth={1.5}
                />
                <text
                  x={cx}
                  y={markerY - r - 5}
                  textAnchor="middle"
                  fontSize="9"
                  fill="rgba(255,255,255,0.5)"
                >
                  {ev.year}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected event detail */}
      {selectedEvent ? (
        <div className="rounded-lg border border-white/10 p-3 space-y-1 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: categoryColor(selectedEvent.category) }}
            />
            <span className="text-xs text-white/40">{selectedEvent.year}</span>
            {selectedEvent.category && (
              <span className="text-xs text-white/30">{selectedEvent.category}</span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-white/80">{selectedEvent.title}</h4>
          <p className="text-sm text-white/60 leading-relaxed">{selectedEvent.description}</p>
        </div>
      ) : (
        <p className="text-xs text-white/30 italic text-center">Click an event to see details</p>
      )}

      {/* Legend */}
      {Object.entries(CATEGORY_COLORS)
        .filter(([cat]) => events.some((e) => e.category?.toLowerCase() === cat))
        .length > 0 && (
        <div className="flex flex-wrap gap-3 pt-1">
          {Object.entries(CATEGORY_COLORS)
            .filter(([cat]) => events.some((e) => e.category?.toLowerCase() === cat))
            .map(([cat, color]) => (
              <span key={cat} className="flex items-center gap-1 text-xs text-white/40">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {cat}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
