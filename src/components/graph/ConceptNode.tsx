"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import { DOMAIN_COLORS, type ProgressStatus, type ConceptDomain } from "@/types";
import {
  Plus,
  Minus,
  X,
  Divide,
  Percent,
  Variable,
  Triangle,
  ArrowDown,
  MoveRight,
  Zap,
  Music,
  Sparkles,
  ListOrdered,
  Building2,
  FlipVertical,
  CircleDot,
} from "lucide-react";

// Map icon names to Lucide components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Plus,
  Minus,
  X,
  Divide,
  Percent,
  Variable,
  Triangle,
  ArrowDown,
  MoveRight,
  Zap,
  Music,
  Sparkles,
  ListOrdered,
  Building2,
  Flip: FlipVertical,
};

export interface ConceptNodeData {
  label: string;
  domain: ConceptDomain;
  status: ProgressStatus;
  icon: string | null;
  description: string;
  difficulty: number;
  [key: string]: unknown;
}

type ConceptGraphNodeProps = NodeProps & {
  data: ConceptNodeData;
};

function ConceptGraphNode({ data }: ConceptGraphNodeProps) {
  const { label, domain, status, icon, difficulty } = data;
  const color = DOMAIN_COLORS[domain];
  const IconComponent = icon ? ICON_MAP[icon] ?? CircleDot : CircleDot;

  const isMastered = status === "mastered";
  const isUnlocked = status === "unlocked";
  const isLocked = status === "locked";

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="group relative"
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-transparent !border-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-transparent !border-0"
      />

      {/* Glow effect for mastered nodes */}
      {isMastered && (
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Main node */}
      <div
        className={`
          relative flex flex-col items-center gap-2 rounded-2xl px-5 py-4
          transition-all duration-300 cursor-pointer select-none
          min-w-[140px]
          ${
            isLocked
              ? "bg-slate-800/60 border border-slate-700/50 opacity-50"
              : isMastered
              ? "bg-slate-800/90 border-2"
              : "bg-slate-800/80 border border-slate-600/60 hover:border-slate-500"
          }
        `}
        style={{
          borderColor: isMastered ? color : undefined,
          boxShadow: isMastered ? `0 0 20px ${color}30` : undefined,
        }}
      >
        {/* Icon */}
        <div
          className={`
            flex items-center justify-center w-10 h-10 rounded-xl
            ${isLocked ? "bg-slate-700/50" : "bg-slate-700/80"}
          `}
          style={{
            color: isLocked ? "#64748b" : color,
          }}
        >
          <IconComponent className="w-5 h-5" />
        </div>

        {/* Title */}
        <span
          className={`
            text-sm font-semibold text-center leading-tight
            ${isLocked ? "text-slate-600" : "text-slate-200"}
          `}
        >
          {label}
        </span>

        {/* Difficulty dots */}
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${
                i < difficulty
                  ? isLocked
                    ? "bg-slate-600"
                    : "bg-slate-400"
                  : "bg-slate-700/50"
              }`}
            />
          ))}
        </div>

        {/* Status indicator */}
        {isMastered && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs"
            style={{ backgroundColor: color }}
          >
            <span className="text-white font-bold text-[10px]">✓</span>
          </motion.div>
        )}

        {isUnlocked && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}

        {isLocked && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center">
            <span className="text-slate-500 text-[9px]">🔒</span>
          </div>
        )}
      </div>

      {/* Hover tooltip — prerequisites needed */}
      {isLocked && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="text-[10px] text-slate-500 whitespace-nowrap bg-slate-900 px-2 py-1 rounded">
            Prerequisites needed
          </span>
        </div>
      )}
    </motion.div>
  );
}

export default memo(ConceptGraphNode);
