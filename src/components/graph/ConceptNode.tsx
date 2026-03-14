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
  justMastered?: boolean;
  justUnlocked?: boolean;
  [key: string]: unknown;
}

type ConceptGraphNodeProps = NodeProps & {
  data: ConceptNodeData;
};

function ConceptGraphNode({ data }: ConceptGraphNodeProps) {
  const { label, domain, status, icon, difficulty, justMastered, justUnlocked } = data;
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

      {/* Glow pulse for mastered nodes */}
      {isMastered && (
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)`,
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

      {/* Mastery burst rings */}
      {justMastered && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={`burst-${i}`}
              className="absolute inset-0 rounded-2xl border border-white/60"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 2 + i * 0.5, opacity: 0 }}
              transition={{
                duration: 1.5,
                delay: i * 0.2,
                ease: "easeOut",
              }}
            />
          ))}
        </>
      )}

      {/* Unlock pulse */}
      {justUnlocked && (
        <motion.div
          className="absolute inset-0 rounded-2xl border border-white/40"
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0, 0.7] }}
          transition={{
            duration: 1.5,
            repeat: 3,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Main node */}
      <div
        className={`
          relative flex flex-col items-center gap-2 rounded-2xl px-5 py-4
          transition-all duration-300 cursor-pointer select-none
          min-w-[140px] bg-black border
          ${
            isLocked
              ? "border-white/8 opacity-30"
              : isMastered
              ? "border-white/80"
              : "border-white/20 hover:border-white/40"
          }
        `}
        style={
          isMastered
            ? {
                boxShadow:
                  "0 0 16px rgba(255,255,255,0.18), 0 0 32px rgba(255,255,255,0.06)",
              }
            : undefined
        }
      >
        {/* Icon */}
        <div
          className={`
            flex items-center justify-center w-10 h-10 rounded-xl
            ${isLocked ? "text-white/20" : isMastered ? "text-white" : "text-white/60"}
          `}
        >
          <IconComponent className="w-5 h-5" />
        </div>

        {/* Title */}
        <span
          className={`
            text-sm font-semibold text-center leading-tight
            ${isLocked ? "text-white/20" : isMastered ? "text-white text-glow-subtle" : "text-white/60"}
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
                    ? "bg-white/15"
                    : isMastered
                    ? "bg-white"
                    : "bg-white/40"
                  : "bg-white/6"
              }`}
            />
          ))}
        </div>

        {/* Status indicator */}
        {isMastered && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white flex items-center justify-center"
          >
            <span className="text-black font-bold text-[10px]">✓</span>
          </motion.div>
        )}

        {isUnlocked && (
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-white/70"
          />
        )}

        {isLocked && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black border border-white/10 flex items-center justify-center">
            <span className="text-white/20 text-[9px]">🔒</span>
          </div>
        )}
      </div>

      {/* Hover tooltip */}
      {isLocked && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="text-[10px] text-white/30 whitespace-nowrap bg-black border border-white/10 px-2 py-1 rounded">
            Prerequisites needed
          </span>
        </div>
      )}
    </motion.div>
  );
}

export default memo(ConceptGraphNode);
