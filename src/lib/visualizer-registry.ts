/**
 * src/lib/visualizer-registry.ts
 *
 * Maps visualization keys (used in PlaygroundBlock.visualization) to
 * lazily-loaded React components.
 */

import React from "react";
import type { VisualizerProps } from "@/types";

type VisualizerComponent = React.ComponentType<VisualizerProps>;
type LazyVisualizer = React.LazyExoticComponent<VisualizerComponent>;

const registry: Record<string, LazyVisualizer> = {
  projectile_motion: React.lazy(
    () => import("@/components/visualizers/ProjectileMotion")
  ),
  wave_superposition: React.lazy(
    () => import("@/components/visualizers/WaveSuperposition")
  ),
  simple_harmonic_motion: React.lazy(
    () => import("@/components/visualizers/SimpleHarmonicMotion")
  ),
  free_fall: React.lazy(
    () => import("@/components/visualizers/FreeFallMotion")
  ),
  function_plot: React.lazy(
    () => import("@/components/visualizers/FunctionPlot")
  ),
  circular_motion: React.lazy(
    () => import("@/components/visualizers/CircularMotion")
  ),
};

export function getVisualizer(key: string): LazyVisualizer | null {
  return registry[key] ?? null;
}
