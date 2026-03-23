"use client";

import { useCallback, useMemo, useEffect } from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import ConceptGraphNode, { type ConceptNodeData } from "./ConceptNode";
import { useGraphStore } from "@/store/graph-store";

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

  // Clear mastery animations after they play
  useEffect(() => {
    if (recentlyMasteredId || recentlyUnlockedIds.length > 0) {
      const timer = setTimeout(() => {
        clearMasteryAnimation();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [recentlyMasteredId, recentlyUnlockedIds, clearMasteryAnimation]);

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

  return (
    <div className="w-full h-full">
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
