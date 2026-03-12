import { Concept, ConceptPrerequisite, Lesson, StudentProgress } from "@/types";

// ============================================
// Dummy Concepts — Cross-disciplinary Knowledge Graph
// ============================================

export const CONCEPTS: Concept[] = [
  // --- Math ---
  {
    id: "c-addition",
    title: "Addition",
    description:
      "The foundation of all arithmetic. Combine quantities to find their total.",
    domain: "math",
    icon: "Plus",
    difficulty: 1,
    position_x: 0,
    position_y: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "c-subtraction",
    title: "Subtraction",
    description: "Taking away one quantity from another to find the difference.",
    domain: "math",
    icon: "Minus",
    difficulty: 1,
    position_x: 250,
    position_y: -50,
    created_at: new Date().toISOString(),
  },
  {
    id: "c-multiplication",
    title: "Multiplication",
    description:
      "Repeated addition — the gateway to understanding scale and proportion.",
    domain: "math",
    icon: "X",
    difficulty: 2,
    position_x: 500,
    position_y: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "c-division",
    title: "Division",
    description:
      "Splitting quantities into equal parts. The inverse of multiplication.",
    domain: "math",
    icon: "Divide",
    difficulty: 2,
    position_x: 500,
    position_y: 200,
    created_at: new Date().toISOString(),
  },
  {
    id: "c-fractions",
    title: "Fractions",
    description:
      "Parts of a whole — critical for understanding ratio, rhythm, and proportion.",
    domain: "math",
    icon: "Percent",
    difficulty: 3,
    position_x: 750,
    position_y: 100,
    created_at: new Date().toISOString(),
  },
  {
    id: "c-algebra-intro",
    title: "Intro to Algebra",
    description:
      "Using symbols to represent unknowns. The beginning of abstract mathematical thinking.",
    domain: "math",
    icon: "Variable",
    difficulty: 4,
    position_x: 1000,
    position_y: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "c-geometry",
    title: "Geometry Basics",
    description:
      "Shapes, angles, and spatial reasoning. The mathematics of the physical world.",
    domain: "math",
    icon: "Triangle",
    difficulty: 2,
    position_x: 250,
    position_y: 250,
    created_at: new Date().toISOString(),
  },

  // --- Science ---
  {
    id: "c-gravity",
    title: "Gravity",
    description:
      "The invisible force that keeps us grounded — and governs the motion of planets.",
    domain: "science",
    icon: "ArrowDown",
    difficulty: 2,
    position_x: 250,
    position_y: 500,
    created_at: new Date().toISOString(),
  },
  {
    id: "c-motion",
    title: "Forces & Motion",
    description:
      "How objects move, accelerate, and respond to forces acting upon them.",
    domain: "science",
    icon: "MoveRight",
    difficulty: 3,
    position_x: 500,
    position_y: 450,
    created_at: new Date().toISOString(),
  },
  {
    id: "c-energy",
    title: "Energy",
    description:
      "The capacity to do work. It transforms, transfers, but never disappears.",
    domain: "science",
    icon: "Zap",
    difficulty: 3,
    position_x: 750,
    position_y: 500,
    created_at: new Date().toISOString(),
  },

  // --- Art ---
  {
    id: "c-symmetry",
    title: "Symmetry",
    description:
      "Balance and reflection — a principle shared by mathematics, nature, and art.",
    domain: "art",
    icon: "Flip",
    difficulty: 2,
    position_x: 500,
    position_y: -200,
    created_at: new Date().toISOString(),
  },
  {
    id: "c-architecture",
    title: "Architecture Basics",
    description:
      "Designing structures that stand — combining geometry, physics, and beauty.",
    domain: "art",
    icon: "Building2",
    difficulty: 4,
    position_x: 750,
    position_y: -200,
    created_at: new Date().toISOString(),
  },

  // --- Music ---
  {
    id: "c-rhythm",
    title: "Musical Time Signatures",
    description:
      "Rhythm is fractions made audible. Understanding beats, bars, and timing.",
    domain: "music",
    icon: "Music",
    difficulty: 3,
    position_x: 1000,
    position_y: 200,
    created_at: new Date().toISOString(),
  },

  // --- Logic ---
  {
    id: "c-patterns",
    title: "Pattern Recognition",
    description:
      "The ability to see repeating structures — the root of all reasoning.",
    domain: "logic",
    icon: "Sparkles",
    difficulty: 1,
    position_x: 0,
    position_y: 250,
    created_at: new Date().toISOString(),
  },
  {
    id: "c-sequences",
    title: "Sequences & Series",
    description:
      "Ordered patterns in numbers. What comes next — and why?",
    domain: "logic",
    icon: "ListOrdered",
    difficulty: 3,
    position_x: 750,
    position_y: 300,
    created_at: new Date().toISOString(),
  },
];

// ============================================
// Prerequisites (Edges)
// ============================================

export const PREREQUISITES: ConceptPrerequisite[] = [
  // Multiplication requires Addition
  { concept_id: "c-multiplication", prerequisite_id: "c-addition" },
  // Division requires Multiplication
  { concept_id: "c-division", prerequisite_id: "c-multiplication" },
  // Fractions require Multiplication + Division
  { concept_id: "c-fractions", prerequisite_id: "c-multiplication" },
  { concept_id: "c-fractions", prerequisite_id: "c-division" },
  // Algebra requires Fractions + Subtraction
  { concept_id: "c-algebra-intro", prerequisite_id: "c-fractions" },
  { concept_id: "c-algebra-intro", prerequisite_id: "c-subtraction" },
  // Musical Time Signatures require Fractions
  { concept_id: "c-rhythm", prerequisite_id: "c-fractions" },
  // Symmetry requires Geometry
  { concept_id: "c-symmetry", prerequisite_id: "c-geometry" },
  // Architecture requires Geometry + Symmetry
  { concept_id: "c-architecture", prerequisite_id: "c-geometry" },
  { concept_id: "c-architecture", prerequisite_id: "c-symmetry" },
  // Forces & Motion require Gravity + Addition
  { concept_id: "c-motion", prerequisite_id: "c-gravity" },
  { concept_id: "c-motion", prerequisite_id: "c-addition" },
  // Energy requires Forces & Motion
  { concept_id: "c-energy", prerequisite_id: "c-motion" },
  // Sequences require Patterns + Multiplication
  { concept_id: "c-sequences", prerequisite_id: "c-patterns" },
  { concept_id: "c-sequences", prerequisite_id: "c-multiplication" },
  // Geometry requires Patterns
  { concept_id: "c-geometry", prerequisite_id: "c-patterns" },
  // Subtraction requires Addition
  { concept_id: "c-subtraction", prerequisite_id: "c-addition" },
];

// ============================================
// Sample Lessons
// ============================================

export const LESSONS: Lesson[] = [
  {
    id: "l-addition-1",
    concept_id: "c-addition",
    title: "What Happens When We Combine?",
    description:
      "Explore addition by combining groups of objects and observing the total.",
    order: 0,
    content_schema: [
      {
        id: "b1",
        type: "text",
        order: 0,
        content:
          "# What Happens When We Combine?\n\nImagine you have a pile of **3 apples** and someone gives you **4 more**. How many apples do you have now?\n\nUse the slider below to explore.",
        style: "body",
      },
      {
        id: "b2",
        type: "interactive_slider",
        order: 1,
        label: "Total apples",
        min: 0,
        max: 10,
        step: 1,
        initial_value: 0,
        correct_value: 7,
        unit: "apples",
      },
      {
        id: "b3",
        type: "text",
        order: 2,
        content:
          "When we **add** 3 + 4, we get **7**. Addition is the process of combining quantities together.",
        style: "callout",
      },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: "l-multiplication-1",
    concept_id: "c-multiplication",
    title: "Groups of Groups",
    description: "Discover multiplication as repeated addition using visual groups.",
    order: 0,
    content_schema: [
      {
        id: "b1",
        type: "text",
        order: 0,
        content:
          "# Groups of Groups\n\nIf you have **4 bags** and each bag has **3 marbles**, how many marbles do you have in total?\n\nThis is actually 3 + 3 + 3 + 3.",
        style: "body",
      },
      {
        id: "b2",
        type: "interactive_slider",
        order: 1,
        label: "Total marbles",
        min: 0,
        max: 20,
        step: 1,
        initial_value: 0,
        correct_value: 12,
        unit: "marbles",
      },
      {
        id: "b3",
        type: "multiple_choice",
        order: 2,
        question: "Which expression represents '4 bags of 3 marbles'?",
        options: [
          { id: "a", text: "4 + 3" },
          { id: "b", text: "4 × 3" },
          { id: "c", text: "4 - 3" },
          { id: "d", text: "4 ÷ 3" },
        ],
        correct_option_id: "b",
      },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: "l-fractions-1",
    concept_id: "c-fractions",
    title: "Parts of a Whole",
    description:
      "Understand fractions by dividing shapes and quantities into equal parts.",
    order: 0,
    content_schema: [
      {
        id: "b1",
        type: "text",
        order: 0,
        content:
          "# Parts of a Whole\n\nImagine you have a pizza cut into **8 equal slices**. You eat **3** of them.\n\nWhat fraction of the pizza did you eat?",
        style: "body",
      },
      {
        id: "b2",
        type: "drag_drop_match",
        order: 1,
        instruction: "Match each scenario to its fraction:",
        items: [
          { id: "i1", content: "3 out of 8 slices" },
          { id: "i2", content: "1 out of 2 halves" },
          { id: "i3", content: "2 out of 4 quarters" },
        ],
        targets: [
          { id: "t1", label: "3/8" },
          { id: "t2", label: "1/2" },
          { id: "t3", label: "2/4" },
        ],
        correct_mapping: { i1: "t1", i2: "t2", i3: "t3" },
      },
    ],
    created_at: new Date().toISOString(),
  },
];

// ============================================
// Default Student Progress (demo: some unlocked, some mastered)
// ============================================

export const DEFAULT_PROGRESS: Omit<
  StudentProgress,
  "id" | "created_at" | "updated_at"
>[] = [
  {
    user_id: "demo-student",
    concept_id: "c-addition",
    status: "mastered",
    productive_struggle_metric: 0.85,
    total_time_spent_seconds: 420,
    attempts: 3,
    last_accessed_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  },
  {
    user_id: "demo-student",
    concept_id: "c-subtraction",
    status: "mastered",
    productive_struggle_metric: 0.72,
    total_time_spent_seconds: 380,
    attempts: 4,
    last_accessed_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  },
  {
    user_id: "demo-student",
    concept_id: "c-patterns",
    status: "mastered",
    productive_struggle_metric: 0.9,
    total_time_spent_seconds: 300,
    attempts: 2,
    last_accessed_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  },
  {
    user_id: "demo-student",
    concept_id: "c-geometry",
    status: "unlocked",
    productive_struggle_metric: 0.3,
    total_time_spent_seconds: 120,
    attempts: 1,
    last_accessed_at: new Date().toISOString(),
    completed_at: null,
  },
  {
    user_id: "demo-student",
    concept_id: "c-multiplication",
    status: "unlocked",
    productive_struggle_metric: 0.4,
    total_time_spent_seconds: 200,
    attempts: 2,
    last_accessed_at: new Date().toISOString(),
    completed_at: null,
  },
  {
    user_id: "demo-student",
    concept_id: "c-gravity",
    status: "unlocked",
    productive_struggle_metric: 0.0,
    total_time_spent_seconds: 0,
    attempts: 0,
    last_accessed_at: null,
    completed_at: null,
  },
  // Everything else is locked by default
];
