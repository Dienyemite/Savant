"use client";

import type { LessonBlock, LessonBlockType, SpatialBlock } from "@/types";
import TextBlockRenderer from "./blocks/TextBlockRenderer";
import InteractiveSliderRenderer from "./blocks/InteractiveSliderRenderer";
import DragDropMatchRenderer from "./blocks/DragDropMatchRenderer";
import FormulaBuilderRenderer from "./blocks/FormulaBuilderRenderer";
import MultipleChoiceRenderer from "./blocks/MultipleChoiceRenderer";
import VisualFeedbackRenderer from "./blocks/VisualFeedbackRenderer";
import AnalogyBlockRenderer from "./blocks/AnalogyBlockRenderer";
import StepTraceRenderer from "./blocks/StepTraceRenderer";
import PlaygroundRenderer from "./blocks/PlaygroundRenderer";
import SketchRenderer from "./blocks/SketchRenderer";
import TimelineRenderer from "./blocks/TimelineRenderer";
import QuoteAnalysisRenderer from "./blocks/QuoteAnalysisRenderer";
import KeyTermsRenderer from "./blocks/KeyTermsRenderer";
import WorkedExampleRenderer from "./blocks/WorkedExampleRenderer";

// ============================================
// Lesson Block Renderer
// Takes a LessonBlock JSON definition and renders
// the corresponding interactive React component.
//
// To add a new block type:
//   1. Add the type to LessonBlockType in types/index.ts
//   2. Create the renderer in ./blocks/
//   3. Add a single entry to BLOCK_REGISTRY below
// ============================================

interface Props {
  block: LessonBlock;
  /** Forwarded to TextBlockRenderer for spatial hit-testing (Sprint 4.4) */
  onSpatialUpdate?: (blocks: SpatialBlock[]) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRenderer = React.ComponentType<{ block: any; onSpatialUpdate?: (blocks: SpatialBlock[]) => void }>;

const BLOCK_REGISTRY: Record<LessonBlockType, AnyRenderer> = {
  text: TextBlockRenderer,
  interactive_slider: InteractiveSliderRenderer,
  drag_drop_match: DragDropMatchRenderer,
  formula_builder: FormulaBuilderRenderer,
  multiple_choice: MultipleChoiceRenderer,
  visual_feedback: VisualFeedbackRenderer,
  analogy: AnalogyBlockRenderer,
  step_trace: StepTraceRenderer,
  playground: PlaygroundRenderer,
  sketch: SketchRenderer,
  timeline: TimelineRenderer,
  quote_analysis: QuoteAnalysisRenderer,
  key_terms: KeyTermsRenderer,
  worked_example: WorkedExampleRenderer,
};

export default function LessonBlockRenderer({ block, onSpatialUpdate }: Props) {
  const Renderer = BLOCK_REGISTRY[block.type];
  if (!Renderer) return null;
  return <Renderer block={block} onSpatialUpdate={onSpatialUpdate} />;
}
