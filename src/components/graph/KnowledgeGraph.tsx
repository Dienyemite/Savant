"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
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
import { DOMAIN_COLORS } from "@/types";

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
  } = useGraphStore();

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
        },
      })),
    [concepts, progressMap]
  );

  // Build React Flow edges from prerequisites
  const initialEdges: Edge[] = useMemo(
    () =>
      prerequisites.map((prereq) => {
        const sourceConcept = concepts.find(
          (c) => c.id === prereq.prerequisite_id
        );
        const sourceStatus = progressMap.get(prereq.prerequisite_id);
        const targetStatus = progressMap.get(prereq.concept_id);
        const domain = sourceConcept?.domain ?? "math";
        const color = DOMAIN_COLORS[domain];

        const isActive =
          sourceStatus === "mastered" && targetStatus !== "locked";

        return {
          id: `${prereq.prerequisite_id}->${prereq.concept_id}`,
          source: prereq.prerequisite_id,
          target: prereq.concept_id,
          type: "default",
          animated: isActive,
          style: {
            stroke: isActive ? color : "#334155",
            strokeWidth: isActive ? 2 : 1,
            opacity: isActive ? 0.8 : 0.3,
          },
        };
      }),
    [prerequisites, concepts, progressMap]
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
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#1e293b"
        />
        <Controls
          className="!bg-slate-800/90 !border-slate-700 !rounded-xl !shadow-xl [&>button]:!bg-slate-700 [&>button]:!border-slate-600 [&>button]:!text-slate-300 [&>button:hover]:!bg-slate-600"
          showInteractive={false}
        />
        <MiniMap
          className="!bg-slate-900/90 !border-slate-700 !rounded-xl"
          nodeColor={(node) => {
            const data = node.data as ConceptNodeData;
            if (data.status === "locked") return "#334155";
            return DOMAIN_COLORS[data.domain] ?? "#64748b";
          }}
          maskColor="rgba(0, 0, 0, 0.7)"
        />
      </ReactFlow>
    </div>
  );
}
