// ============================================
// Savant — Core Type Definitions
// ============================================

// --- Enums ---

export type UserRole = "student" | "teacher" | "admin";

export type ConceptDomain =
  | "math"
  | "science"
  | "art"
  | "music"
  | "language"
  | "logic";

export type ProgressStatus = "locked" | "unlocked" | "mastered";

// --- Database Models ---

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  focus_score: number;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Concept {
  id: string;
  title: string;
  description: string;
  domain: ConceptDomain;
  icon: string | null;
  difficulty: number;
  position_x: number;
  position_y: number;
  created_at: string;
}

export interface ConceptPrerequisite {
  concept_id: string;
  prerequisite_id: string;
}

export interface Lesson {
  id: string;
  concept_id: string;
  title: string;
  description: string | null;
  content_schema: LessonBlock[];
  order: number;
  created_at: string;
}

export interface StudentProgress {
  id: string;
  user_id: string;
  concept_id: string;
  status: ProgressStatus;
  productive_struggle_metric: number;
  total_time_spent_seconds: number;
  attempts: number;
  last_accessed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Lesson Content Schema ---

export type LessonBlockType =
  | "text"
  | "interactive_slider"
  | "drag_drop_match"
  | "formula_builder"
  | "multiple_choice"
  | "visual_feedback";

export interface LessonBlockBase {
  id: string;
  type: LessonBlockType;
  order: number;
}

export interface TextBlock extends LessonBlockBase {
  type: "text";
  content: string; // Markdown string
  style?: "heading" | "body" | "hint" | "callout";
}

export interface InteractiveSliderBlock extends LessonBlockBase {
  type: "interactive_slider";
  label: string;
  min: number;
  max: number;
  step: number;
  initial_value: number;
  correct_value: number;
  unit?: string;
  feedback_formula?: string; // e.g., "value * 2" — for visual feedback
}

export interface DragDropMatchBlock extends LessonBlockBase {
  type: "drag_drop_match";
  instruction: string;
  items: { id: string; content: string }[];
  targets: { id: string; label: string }[];
  correct_mapping: Record<string, string>; // item_id -> target_id
}

export interface FormulaBuilderBlock extends LessonBlockBase {
  type: "formula_builder";
  instruction: string;
  available_tokens: string[];
  correct_formula: string[];
}

export interface MultipleChoiceBlock extends LessonBlockBase {
  type: "multiple_choice";
  question: string;
  options: { id: string; text: string }[];
  correct_option_id: string;
}

export interface VisualFeedbackBlock extends LessonBlockBase {
  type: "visual_feedback";
  visualization_type: "bar_chart" | "pie_chart" | "number_line" | "scale";
  data_source: string; // References another block's id for dynamic data
  label: string;
}

export type LessonBlock =
  | TextBlock
  | InteractiveSliderBlock
  | DragDropMatchBlock
  | FormulaBuilderBlock
  | MultipleChoiceBlock
  | VisualFeedbackBlock;

// --- Graph UI Types ---

export interface ConceptNode {
  concept: Concept;
  status: ProgressStatus;
  prerequisites: string[]; // concept IDs
  unlocks: string[]; // concept IDs this unlocks
}

// --- Domain color mapping ---

export const DOMAIN_COLORS: Record<ConceptDomain, string> = {
  math:     "rgba(255,255,255,0.9)",    // pure white — the primary domain
  science:  "rgba(180,220,255,0.8)",    // very faint blue-white
  art:      "rgba(255,230,200,0.8)",    // very faint warm white
  music:    "rgba(220,200,255,0.8)",    // very faint lavender-white
  language: "rgba(200,255,220,0.8)",    // very faint green-white
  logic:    "rgba(255,255,180,0.8)",    // very faint yellow-white
};

export const DOMAIN_LABELS: Record<ConceptDomain, string> = {
  math: "Mathematics",
  science: "Science",
  art: "Art & Design",
  music: "Music",
  language: "Language",
  logic: "Logic & Reasoning",
};

// --- Spatial index (Sprint 4.4 — Smart Annotation prerequisite) ---

/**
 * Screen-space bounding box for a single paragraph/heading inside a
 * TextBlockRenderer. Used by the Smart Annotation engine to match
 * highlight strokes to the underlying text they cover.
 */
export interface SpatialBlock {
  blockId: string;
  paragraphIndex: number; // 0-based within the block
  text: string;           // raw text content of this paragraph
  rect: DOMRect;          // current screen-space bounding box
}
