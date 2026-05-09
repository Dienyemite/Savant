import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { HighlightStroke } from "@/store/canvas-store"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * AABB (axis-aligned bounding box) intersection test.
 * Returns true when two DOMRects overlap in both axes.
 * Used by lesson-store.queryByRect for Smart Annotation hit-testing.
 */
export function rectIntersects(a: DOMRect, b: DOMRect): boolean {
  return (
    a.left < b.right &&
    a.right > b.left &&
    a.top < b.bottom &&
    a.bottom > b.top
  );
}

/**
 * Returns the screen-space DOMRect of a highlight stroke given the current
 * viewport transform. Used by the Smart Annotation engine (Sprint 5.3) to
 * determine which lesson text blocks are covered by a highlight.
 */
export function getHighlightBoundingBox(
  stroke: HighlightStroke,
  viewport: { x: number; y: number; zoom: number },
  rfContainerOrigin: { x: number; y: number }
): DOMRect {
  if (stroke.points.length < 2) {
    return new DOMRect(0, 0, 0, 0);
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [px, py] of stroke.points) {
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }

  // Convert canvas-space bounding box → screen-space
  const { x: vx, y: vy, zoom: vz } = viewport;
  const { x: ox, y: oy } = rfContainerOrigin;

  const screenX = ox + vx + minX * vz;
  const screenY = oy + vy + minY * vz;
  const screenW = (maxX - minX) * vz;
  const screenH = (maxY - minY) * vz;

  return new DOMRect(screenX, screenY, screenW, screenH);
}
