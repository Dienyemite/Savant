"use client";

import type { LessonBlock } from "@/types";
import TextBlockRenderer from "./blocks/TextBlockRenderer";
import InteractiveSliderRenderer from "./blocks/InteractiveSliderRenderer";
import DragDropMatchRenderer from "./blocks/DragDropMatchRenderer";
import FormulaBuilderRenderer from "./blocks/FormulaBuilderRenderer";
import MultipleChoiceRenderer from "./blocks/MultipleChoiceRenderer";
import VisualFeedbackRenderer from "./blocks/VisualFeedbackRenderer";

// ============================================
// Lesson Block Renderer (Parser)
// Takes a LessonBlock JSON definition and renders
// the corresponding interactive React component.
// ============================================

interface Props {
  block: LessonBlock;
}

export default function LessonBlockRenderer({ block }: Props) {
  switch (block.type) {
    case "text":
      return <TextBlockRenderer block={block} />;
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
    default:
      return null;
  }
}
