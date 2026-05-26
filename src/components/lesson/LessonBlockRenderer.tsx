"use client";

import type { LessonBlock, SpatialBlock } from "@/types";
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
// Lesson Block Renderer (Parser)
// Takes a LessonBlock JSON definition and renders
// the corresponding interactive React component.
// ============================================

interface Props {
  block: LessonBlock;
  /** Forwarded to TextBlockRenderer for spatial hit-testing (Sprint 4.4) */
  onSpatialUpdate?: (blocks: SpatialBlock[]) => void;
}

export default function LessonBlockRenderer({ block, onSpatialUpdate }: Props) {
  switch (block.type) {
    case "text":
      return <TextBlockRenderer block={block} onSpatialUpdate={onSpatialUpdate} />;
    case "interactive_slider":
      return <InteractiveSliderRenderer block={block} />;
    case "drag_drop_match":
      return <DragDropMatchRenderer block={block} />;
    case "formula_builder":
      return <FormulaBuilderRenderer block={block} />;
    case "multiple_choice":
      return <MultipleChoiceRenderer block={block} />;
    case "visual_feedback":
      return <VisualFeedbackRenderer block={block} />;
    case "analogy":
      return <AnalogyBlockRenderer block={block} />;
    case "step_trace":
      return <StepTraceRenderer block={block} />;
    case "playground":
      return <PlaygroundRenderer block={block} />;
    case "sketch":
      return <SketchRenderer block={block} />;
    case "timeline":
      return <TimelineRenderer block={block} />;
    case "quote_analysis":
      return <QuoteAnalysisRenderer block={block} />;
    case "key_terms":
      return <KeyTermsRenderer block={block} />;
    case "worked_example":
      return <WorkedExampleRenderer block={block} />;
    default:
      return null;
  }
}
