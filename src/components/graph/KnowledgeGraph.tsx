"use client";

import { useCallback, useMemo, useEffect, useRef, type MutableRefObject } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  BackgroundVariant,
  ConnectionLineType,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import ConceptGraphNode, { type ConceptNodeData } from "./ConceptNode";
import { useGraphStore } from "@/store/graph-store";
import { useCanvasStore, LESSON_ZOOM_THRESHOLD } from "@/store/canvas-store";
import { useLessonStore } from "@/store/lesson-store";

// Register custom node types
const nodeTypes = {
  concept: ConceptGraphNode,
};

export default function KnowledgeGraph() {
  const {
    concepts,
    prerequisites,
    progressMap,
    openLessonModal,
    selectConcept,
    recentlyMasteredId,
    recentlyUnlockedIds,
    clearMasteryAnimation,
  } = useGraphStore();

  const setViewport = useCanvasStore((s) => s.setViewport);
  const setRfContainerOrigin = useCanvasStore((s) => s.setRfContainerOrigin);
  const storePreLessonViewport = useCanvasStore((s) => s.storePreLessonViewport);
  const preLessonViewport = useCanvasStore((s) => s.preLessonViewport);
  const clearPreLessonViewport = useCanvasStore((s) => s.clearPreLessonViewport);
  const isLessonActive = useLessonStore((s) => s.isLessonActive);

  const containerRef = useRef<HTMLDivElement>(null);
  // RAF handle — throttles onMove so React state updates are capped at 1/frame
  const rafRef = useRef<number>(0) as MutableRefObject<number>;
  // Stores the ReactFlow instance so we can programmatically set the viewport
  const rfInstanceRef = useRef<ReactFlowInstance<Node<ConceptNodeData>, Edge> | null>(null);
  // Tracks which conceptId we already zoom-triggered to avoid re-triggering
  const zoomTriggeredRef = useRef<string | null>(null);
  // Tracks previous isLessonActive to detect the lesson->exit transition
  const prevLessonActiveRef = useRef(false);

  // Clear mastery animations after they play
  useEffect(() => {
    if (recentlyMasteredId || recentlyUnlockedIds.length > 0) {
      const timer = setTimeout(() => {
        clearMasteryAnimation();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [recentlyMasteredId, recentlyUnlockedIds, clearMasteryAnimation]);

  // Report the ReactFlow container's screen-space origin to the canvas store
  // so InkLayer and TextNoteLayer can convert screen ↔ canvas coordinates.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setRfContainerOrigin(rect.left, rect.top);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [setRfContainerOrigin]);

  // Build React Flow nodes from concepts
  const initialNodes: Node<ConceptNodeData>[] = useMemo(
    () =>
      concepts.map((concept) => ({
        id: concept.id,
        type: "concept",
        position: { x: concept.position_x, y: concept.position_y },
        data: {
          label: concept.title,
          domain: concept.domain,
          status: progressMap.get(concept.id) ?? "locked",
          icon: concept.icon,
          description: concept.description,
          difficulty: concept.difficulty,
          justMastered: concept.id === recentlyMasteredId,
          justUnlocked: recentlyUnlockedIds.includes(concept.id),
        },
      })),
    [concepts, progressMap, recentlyMasteredId, recentlyUnlockedIds]
  );

  // Build React Flow edges from prerequisites — strictly monochrome constellation lines
  const initialEdges: Edge[] = useMemo(
    () =>
      prerequisites.map((prereq) => {
        const sourceStatus = progressMap.get(prereq.prerequisite_id);
        const targetStatus = progressMap.get(prereq.concept_id);

        const isActive =
          sourceStatus === "mastered" && targetStatus !== "locked";
        const isFreshBridge = recentlyUnlockedIds.includes(prereq.concept_id);

        return {
          id: `${prereq.prerequisite_id}->${prereq.concept_id}`,
          source: prereq.prerequisite_id,
          target: prereq.concept_id,
          type: "default",
          animated: false,
          style: {
            stroke: isFreshBridge
              ? "rgba(255,255,255,0.75)"
              : isActive
              ? "rgba(255,255,255,0.40)"
              : "rgba(255,255,255,0.07)",
            strokeWidth: isFreshBridge ? 1.5 : isActive ? 1 : 0.75,
            strokeDasharray: isActive || isFreshBridge ? undefined : "3 4",
          },
        };
      }),
    [prerequisites, progressMap, recentlyUnlockedIds]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Handle node click — open lesson modal for unlocked/mastered, show info for locked
  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      const status = progressMap.get(node.id);
      if (status === "unlocked" || status === "mastered") {
        openLessonModal(node.id);
      } else {
        selectConcept(node.id);
      }
    },
    [progressMap, openLessonModal, selectConcept]
  );

  // Restore viewport when lesson closes (Sprint 1.7 back-navigation)
  useEffect(() => {
    if (prevLessonActiveRef.current && !isLessonActive) {
      // Lesson just deactivated — restore the saved viewport with a 400ms ease-in-out
      if (preLessonViewport && rfInstanceRef.current) {
        rfInstanceRef.current.setViewport(preLessonViewport, { duration: 400 });
        clearPreLessonViewport();
      }
    }
    prevLessonActiveRef.current = isLessonActive;
  }, [isLessonActive, preLessonViewport, clearPreLessonViewport]);

  const handleInit = useCallback(
    (rf: ReactFlowInstance<Node<ConceptNodeData>, Edge>) => {
      rfInstanceRef.current = rf;
      const vp = rf.getViewport();
      setViewport(vp.x, vp.y, vp.zoom);
    },
    [setViewport]
  );

  return (
    <div ref={containerRef} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="bg-transparent"
        onInit={handleInit}
        onMove={(_, vp) => {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(() => {
            setViewport(vp.x, vp.y, vp.zoom);

            // Sprint 1.7: detect zoom crossing LESSON_ZOOM_THRESHOLD with a centred node
            if (vp.zoom < LESSON_ZOOM_THRESHOLD) {
              // Below threshold — reset trigger so next zoom-in can fire again
              zoomTriggeredRef.current = null;
              return;
            }

            // Find the concept node closest to the viewport centre
            const el = containerRef.current;
            if (!el) return;
            const cx = (el.clientWidth / 2 - vp.x) / vp.zoom;
            const cy = (el.clientHeight / 2 - vp.y) / vp.zoom;

            let closestId: string | null = null;
            let closestDist = Infinity;
            for (const node of nodes) {
              const dx = node.position.x - cx;
              const dy = node.position.y - cy;
              const dist = Math.hypot(dx, dy);
              if (dist < closestDist) {
                closestDist = dist;
                closestId = node.id;
              }
            }

            // Open lesson if a node is within 80 canvas-units of centre and not already triggered
            if (closestId && closestDist < 80 && closestId !== zoomTriggeredRef.current) {
              const status = progressMap.get(closestId);
              if (status === "unlocked" || status === "mastered") {
                zoomTriggeredRef.current = closestId;
                storePreLessonViewport();
                openLessonModal(closestId);
              }
            }
          });
        }}
      >
        {/* Ruled lines — horizontal notebook lines drawn across the constellation */}
        <Background
          variant={BackgroundVariant.Lines}
          gap={32}
          size={1}
          color="rgba(255,255,255,0.035)"
          style={{ strokeDasharray: undefined }}
        />
        <Controls
          className="!bg-black !border !border-white/[0.07] !rounded-none !shadow-none [&>button]:!bg-black [&>button]:!border-white/[0.07] [&>button]:!text-white/30 [&>button:hover]:!bg-white/5 [&>button]:!rounded-none"
          showInteractive={false}
        />
      </ReactFlow>
    </div>
  );
}
