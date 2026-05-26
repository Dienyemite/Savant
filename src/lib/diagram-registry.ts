/**
 * src/lib/diagram-registry.ts
 *
 * Maps diagram keys (used in SketchBlock.diagram_type) to
 * lazily-loaded React SVG components.
 */

import React from "react";
import type { DiagramProps } from "@/types";

type DiagramComponent = React.ComponentType<DiagramProps>;
type LazyDiagram = React.LazyExoticComponent<DiagramComponent>;

const registry: Record<string, LazyDiagram> = {
  parabola: React.lazy(
    () => import("@/components/diagrams/ParabolaArc")
  ),
  free_body: React.lazy(
    () => import("@/components/diagrams/FreeBodyDiagram")
  ),
  waveform: React.lazy(
    () => import("@/components/diagrams/WaveformSketch")
  ),
  circle_angle: React.lazy(
    () => import("@/components/diagrams/CircleWithAngle")
  ),
  inclined_plane: React.lazy(
    () => import("@/components/diagrams/InclinedPlane")
  ),
};

export function getDiagram(key: string): LazyDiagram | null {
  return registry[key] ?? null;
}
