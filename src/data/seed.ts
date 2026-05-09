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
  // --- Addition Lesson 2: Building upon the first ---
  {
    id: "l-addition-2",
    concept_id: "c-addition",
    title: "Addition with Bigger Numbers",
    description:
      "Practice addition with larger quantities and see visual feedback.",
    order: 1,
    content_schema: [
      {
        id: "a2-b1",
        type: "text",
        order: 0,
        content:
          "# Adding Bigger Numbers\n\nNow let's think bigger. If you have **8 books** on one shelf and **6 books** on another, how many books do you have in total?",
        style: "body",
      },
      {
        id: "a2-b2",
        type: "interactive_slider",
        order: 1,
        label: "Total books",
        min: 0,
        max: 20,
        step: 1,
        initial_value: 0,
        correct_value: 14,
        unit: "books",
      },
      {
        id: "a2-b3",
        type: "multiple_choice",
        order: 2,
        question: "Which of these additions gives the LARGEST result?",
        options: [
          { id: "a", text: "5 + 4 = 9" },
          { id: "b", text: "7 + 7 = 14" },
          { id: "c", text: "3 + 6 = 9" },
          { id: "d", text: "8 + 2 = 10" },
        ],
        correct_option_id: "b",
      },
      {
        id: "a2-b4",
        type: "text",
        order: 3,
        content:
          "Notice: the order doesn't matter! **8 + 6** gives the same result as **6 + 8**. This property is called *commutativity*.",
        style: "callout",
      },
    ],
    created_at: new Date().toISOString(),
  },
  // --- Subtraction Lesson ---
  {
    id: "l-subtraction-1",
    concept_id: "c-subtraction",
    title: "Taking Away",
    description:
      "Learn subtraction by removing items from a group.",
    order: 0,
    content_schema: [
      {
        id: "s1-b1",
        type: "text",
        order: 0,
        content:
          "# Taking Away\n\nYou have **10 cookies**. You give **4** to your friend.\n\nHow many cookies do you have left?",
        style: "body",
      },
      {
        id: "s1-b2",
        type: "interactive_slider",
        order: 1,
        label: "Remaining cookies",
        min: 0,
        max: 10,
        step: 1,
        initial_value: 10,
        correct_value: 6,
        unit: "cookies",
      },
      {
        id: "s1-b3",
        type: "text",
        order: 2,
        content:
          "**Subtraction** finds the *difference* between two numbers. It's the opposite of addition: 10 - 4 = 6, and 6 + 4 = 10.",
        style: "callout",
      },
    ],
    created_at: new Date().toISOString(),
  },
  // --- Geometry Lesson ---
  {
    id: "l-geometry-1",
    concept_id: "c-geometry",
    title: "Shapes All Around",
    description:
      "Explore basic geometric shapes and their properties.",
    order: 0,
    content_schema: [
      {
        id: "g1-b1",
        type: "text",
        order: 0,
        content:
          "# Shapes All Around\n\nGeometry is the study of **shapes**, **sizes**, and **positions** of things.\n\nLook around you — geometry is everywhere! Windows are rectangles, wheels are circles, road signs are triangles.",
        style: "body",
      },
      {
        id: "g1-b2",
        type: "drag_drop_match",
        order: 1,
        instruction: "Match each shape to its number of sides:",
        items: [
          { id: "g-i1", content: "Triangle" },
          { id: "g-i2", content: "Square" },
          { id: "g-i3", content: "Pentagon" },
          { id: "g-i4", content: "Hexagon" },
        ],
        targets: [
          { id: "g-t1", label: "3 sides" },
          { id: "g-t2", label: "4 sides" },
          { id: "g-t3", label: "5 sides" },
          { id: "g-t4", label: "6 sides" },
        ],
        correct_mapping: {
          "g-i1": "g-t1",
          "g-i2": "g-t2",
          "g-i3": "g-t3",
          "g-i4": "g-t4",
        },
      },
      {
        id: "g1-b3",
        type: "multiple_choice",
        order: 2,
        question: "A shape with all sides equal and all angles equal is called:",
        options: [
          { id: "a", text: "Irregular polygon" },
          { id: "b", text: "Regular polygon" },
          { id: "c", text: "Asymmetric shape" },
          { id: "d", text: "Open figure" },
        ],
        correct_option_id: "b",
      },
    ],
    created_at: new Date().toISOString(),
  },
  // --- Gravity Lesson ---
  {
    id: "l-gravity-1",
    concept_id: "c-gravity",
    title: "Why Things Fall",
    description:
      "Discover the invisible force that holds the universe together.",
    order: 0,
    content_schema: [
      {
        id: "gr1-b1",
        type: "text",
        order: 0,
        content:
          "# Why Things Fall\n\nDrop a ball. It falls to the ground. But **why**?\n\nThere's an invisible force pulling everything toward the center of the Earth. We call it **gravity**.",
        style: "body",
      },
      {
        id: "gr1-b2",
        type: "multiple_choice",
        order: 1,
        question:
          "If you dropped a feather and a bowling ball on the Moon (no air), which hits the ground first?",
        options: [
          { id: "a", text: "The bowling ball, because it's heavier" },
          { id: "b", text: "The feather, because it's lighter" },
          { id: "c", text: "They hit at the same time" },
          { id: "d", text: "Neither falls — there's no gravity on the Moon" },
        ],
        correct_option_id: "c",
      },
      {
        id: "gr1-b3",
        type: "text",
        order: 2,
        content:
          "Without air resistance, gravity pulls all objects at the **same rate**. This was first demonstrated by Galileo and later confirmed on the Moon by astronaut David Scott!",
        style: "hint",
      },
      {
        id: "gr1-b4",
        type: "interactive_slider",
        order: 3,
        label: "Gravitational acceleration on Earth (m/s²)",
        min: 0,
        max: 20,
        step: 1,
        initial_value: 0,
        correct_value: 10,
        unit: "m/s²",
      },
    ],
    created_at: new Date().toISOString(),
  },
  // --- Multiplication Lesson 2 with Formula Builder ---
  {
    id: "l-multiplication-2",
    concept_id: "c-multiplication",
    title: "Building Expressions",
    description:
      "Construct multiplication expressions from tokens.",
    order: 1,
    content_schema: [
      {
        id: "m2-b1",
        type: "text",
        order: 0,
        content:
          "# Building Expressions\n\nMultiplication can be written in different ways. Let's build a multiplication expression.\n\nA farmer has **5 rows** of apple trees. Each row has **6 trees**. Build the expression for the total number of trees.",
        style: "body",
      },
      {
        id: "m2-b2",
        type: "formula_builder",
        order: 1,
        instruction:
          "Build the expression: 5 rows × 6 trees per row = total trees",
        available_tokens: ["5", "×", "6", "=", "30", "+", "11", "25"],
        correct_formula: ["5", "×", "6", "=", "30"],
      },
      {
        id: "m2-b3",
        type: "text",
        order: 2,
        content:
          "**5 × 6 = 30**. The farmer has 30 trees in total. Multiplication is a powerful shortcut for repeated addition!",
        style: "callout",
      },
    ],
    created_at: new Date().toISOString(),
  },
  // --- Division Lesson ---
  {
    id: "l-division-1",
    concept_id: "c-division",
    title: "Sharing Equally",
    description: "Understand division by splitting groups into equal parts.",
    order: 0,
    content_schema: [
      {
        id: "div1-b1",
        type: "text",
        order: 0,
        content:
          "# Sharing Equally\n\nYou have **12 cookies** to share equally among **4 friends**. How many cookies does each friend get?\n\nDivision answers the question: *How many in each group?*",
        style: "body",
      },
      {
        id: "div1-b2",
        type: "interactive_slider",
        order: 1,
        label: "Cookies per friend",
        min: 0,
        max: 12,
        step: 1,
        initial_value: 0,
        correct_value: 3,
        unit: "cookies",
      },
      {
        id: "div1-b3",
        type: "multiple_choice",
        order: 2,
        question: "What is 15 ÷ 3?",
        options: [
          { id: "a", text: "3" },
          { id: "b", text: "4" },
          { id: "c", text: "5" },
          { id: "d", text: "6" },
        ],
        correct_option_id: "c",
      },
    ],
    created_at: new Date().toISOString(),
  },
  // --- Algebra Intro Lesson ---
  {
    id: "l-algebra-1",
    concept_id: "c-algebra-intro",
    title: "Finding the Unknown",
    description: "Use symbols to represent unknown values and solve equations.",
    order: 0,
    content_schema: [
      {
        id: "alg1-b1",
        type: "text",
        order: 0,
        content:
          "# Finding the Unknown\n\nIn algebra, we use a symbol — like **x** — to represent a number we don't know yet.\n\nIf **x + 5 = 8**, what must x be? We can find out by asking: *what plus 5 gives 8?*",
        style: "body",
      },
      {
        id: "alg1-b2",
        type: "formula_builder",
        order: 1,
        instruction: "Build the solution: x = 8 − 5",
        available_tokens: ["x", "=", "8", "−", "5", "+", "3", "13"],
        correct_formula: ["x", "=", "8", "−", "5"],
      },
      {
        id: "alg1-b3",
        type: "multiple_choice",
        order: 2,
        question: "If 2 × x = 10, what is x?",
        options: [
          { id: "a", text: "2" },
          { id: "b", text: "4" },
          { id: "c", text: "5" },
          { id: "d", text: "20" },
        ],
        correct_option_id: "c",
      },
    ],
    created_at: new Date().toISOString(),
  },
  // --- Forces & Motion Lesson ---
  {
    id: "l-motion-1",
    concept_id: "c-motion",
    title: "Push, Pull, Move",
    description: "Explore how forces cause objects to start, stop, and change direction.",
    order: 0,
    content_schema: [
      {
        id: "mot1-b1",
        type: "text",
        order: 0,
        content:
          "# Push, Pull, Move\n\nA **force** is any push or pull acting on an object. Forces cause objects to speed up, slow down, or change direction.\n\nNewton's second law tells us: **Force = Mass × Acceleration**.",
        style: "body",
      },
      {
        id: "mot1-b2",
        type: "interactive_slider",
        order: 1,
        label: "Speed after 3 s at 10 m/s² acceleration",
        min: 0,
        max: 50,
        step: 5,
        initial_value: 0,
        correct_value: 30,
        unit: "m/s",
      },
      {
        id: "mot1-b3",
        type: "multiple_choice",
        order: 2,
        question: "Which of Newton's laws states that objects at rest stay at rest unless acted on by a force?",
        options: [
          { id: "a", text: "The First Law (Inertia)" },
          { id: "b", text: "The Second Law (F = ma)" },
          { id: "c", text: "The Third Law (action-reaction)" },
          { id: "d", text: "The Law of Gravity" },
        ],
        correct_option_id: "a",
      },
    ],
    created_at: new Date().toISOString(),
  },
  // --- Energy Lesson ---
  {
    id: "l-energy-1",
    concept_id: "c-energy",
    title: "Energy in Action",
    description: "Discover how energy transforms between kinetic and potential forms.",
    order: 0,
    content_schema: [
      {
        id: "en1-b1",
        type: "text",
        order: 0,
        content:
          "# Energy in Action\n\n**Energy** is the ability to do work. It cannot be created or destroyed — only *transformed*.\n\nA ball held high has **potential energy**. When released, it converts to **kinetic energy** (the energy of motion).",
        style: "body",
      },
      {
        id: "en1-b2",
        type: "interactive_slider",
        order: 1,
        label: "Estimated kinetic energy level (1 = slow, 10 = very fast)",
        min: 1,
        max: 10,
        step: 1,
        initial_value: 1,
        correct_value: 8,
        unit: "",
      },
      {
        id: "en1-b3",
        type: "visual_feedback",
        order: 2,
        visualization_type: "bar_chart",
        data_source: "en1-b2",
        label: "Kinetic Energy Gauge",
      },
      {
        id: "en1-b4",
        type: "multiple_choice",
        order: 3,
        question: "When a ball rolls to a stop on a flat surface, where does its kinetic energy go?",
        options: [
          { id: "a", text: "It disappears entirely" },
          { id: "b", text: "It converts to heat via friction" },
          { id: "c", text: "It becomes potential energy" },
          { id: "d", text: "It stays in the ball as motion" },
        ],
        correct_option_id: "b",
      },
    ],
    created_at: new Date().toISOString(),
  },
  // --- Symmetry Lesson ---
  {
    id: "l-symmetry-1",
    concept_id: "c-symmetry",
    title: "Reflections & Balance",
    description: "Discover lines of symmetry in shapes and the natural world.",
    order: 0,
    content_schema: [
      {
        id: "sym1-b1",
        type: "text",
        order: 0,
        content:
          "# Reflections & Balance\n\nA shape has **symmetry** if it can be folded along a line so both halves match perfectly. That fold line is called the **axis of symmetry**.",
        style: "body",
      },
      {
        id: "sym1-b2",
        type: "drag_drop_match",
        order: 1,
        instruction: "Match each shape to its number of lines of symmetry:",
        items: [
          { id: "sym-i1", content: "Equilateral triangle" },
          { id: "sym-i2", content: "Rectangle" },
          { id: "sym-i3", content: "Regular hexagon" },
          { id: "sym-i4", content: "Scalene triangle" },
        ],
        targets: [
          { id: "sym-t1", label: "0 lines" },
          { id: "sym-t2", label: "2 lines" },
          { id: "sym-t3", label: "3 lines" },
          { id: "sym-t4", label: "6 lines" },
        ],
        correct_mapping: {
          "sym-i1": "sym-t3",
          "sym-i2": "sym-t2",
          "sym-i3": "sym-t4",
          "sym-i4": "sym-t1",
        },
      },
      {
        id: "sym1-b3",
        type: "multiple_choice",
        order: 2,
        question: "A circle has how many lines of symmetry?",
        options: [
          { id: "a", text: "1" },
          { id: "b", text: "4" },
          { id: "c", text: "8" },
          { id: "d", text: "Infinitely many" },
        ],
        correct_option_id: "d",
      },
    ],
    created_at: new Date().toISOString(),
  },
  // --- Architecture Lesson ---
  {
    id: "l-architecture-1",
    concept_id: "c-architecture",
    title: "Structure & Form",
    description: "Learn how geometry and forces combine to create stable structures.",
    order: 0,
    content_schema: [
      {
        id: "arc1-b1",
        type: "text",
        order: 0,
        content:
          "# Structure & Form\n\nArchitecture uses **geometry** and **physics** together. Every beam, arch, and column must direct forces safely to the ground.\n\nThe **triangle** is the strongest shape in construction — it cannot be deformed without changing the length of its sides.",
        style: "body",
      },
      {
        id: "arc1-b2",
        type: "multiple_choice",
        order: 1,
        question: "Why is the triangular truss so commonly used in bridges and roofs?",
        options: [
          { id: "a", text: "It uses the least material" },
          { id: "b", text: "It is rigid and cannot flex without breaking" },
          { id: "c", text: "It looks more attractive than rectangles" },
          { id: "d", text: "Triangles are easier to manufacture" },
        ],
        correct_option_id: "b",
      },
      {
        id: "arc1-b3",
        type: "formula_builder",
        order: 2,
        instruction: "Build the formula for the perimeter of a rectangle: P = 2L + 2W",
        available_tokens: ["P", "=", "2L", "+", "2W", "×", "L", "W"],
        correct_formula: ["P", "=", "2L", "+", "2W"],
      },
    ],
    created_at: new Date().toISOString(),
  },
  // --- Musical Time Signatures Lesson ---
  {
    id: "l-rhythm-1",
    concept_id: "c-rhythm",
    title: "The Beat of Fractions",
    description: "Understand time signatures as fractions that govern musical rhythm.",
    order: 0,
    content_schema: [
      {
        id: "rhy1-b1",
        type: "text",
        order: 0,
        content:
          "# The Beat of Fractions\n\nA **time signature** is a fraction at the start of a piece of music.\n\nIn **4/4 time**, the top number tells us there are 4 beats per bar. The bottom tells us each beat is a quarter note.\n\nRhythm *is* fractions made audible.",
        style: "body",
      },
      {
        id: "rhy1-b2",
        type: "interactive_slider",
        order: 1,
        label: "Total beats in 3 bars of 4/4 time",
        min: 0,
        max: 16,
        step: 1,
        initial_value: 0,
        correct_value: 12,
        unit: "beats",
      },
      {
        id: "rhy1-b3",
        type: "multiple_choice",
        order: 2,
        question: "In 3/4 time (waltz), how many beats are in each bar?",
        options: [
          { id: "a", text: "2" },
          { id: "b", text: "3" },
          { id: "c", text: "4" },
          { id: "d", text: "8" },
        ],
        correct_option_id: "b",
      },
    ],
    created_at: new Date().toISOString(),
  },
  // --- Sequences Lesson ---
  {
    id: "l-sequences-1",
    concept_id: "c-sequences",
    title: "What Comes Next?",
    description: "Find the rules behind number sequences and predict future terms.",
    order: 0,
    content_schema: [
      {
        id: "seq1-b1",
        type: "text",
        order: 0,
        content:
          "# What Comes Next?\n\nA **sequence** is an ordered list of numbers following a rule.\n\nLook at: **2, 5, 8, 11, …**\n\nEach term is 3 more than the one before. This is an *arithmetic sequence* with a common difference of 3.",
        style: "body",
      },
      {
        id: "seq1-b2",
        type: "interactive_slider",
        order: 1,
        label: "5th term in the sequence 2, 5, 8, 11, __",
        min: 0,
        max: 20,
        step: 1,
        initial_value: 0,
        correct_value: 14,
        unit: "",
      },
      {
        id: "seq1-b3",
        type: "drag_drop_match",
        order: 2,
        instruction: "Match each sequence to its rule:",
        items: [
          { id: "seq-i1", content: "2, 4, 8, 16, …" },
          { id: "seq-i2", content: "1, 4, 9, 16, …" },
          { id: "seq-i3", content: "10, 7, 4, 1, …" },
        ],
        targets: [
          { id: "seq-t1", label: "Subtract 3 each time" },
          { id: "seq-t2", label: "Square numbers" },
          { id: "seq-t3", label: "Multiply by 2 each time" },
        ],
        correct_mapping: {
          "seq-i1": "seq-t3",
          "seq-i2": "seq-t2",
          "seq-i3": "seq-t1",
        },
      },
    ],
    created_at: new Date().toISOString(),
  },
  // --- Pattern Recognition Lesson ---
  {
    id: "l-patterns-1",
    concept_id: "c-patterns",
    title: "Seeing the Pattern",
    description:
      "Train your eye to spot repeating structures in numbers.",
    order: 0,
    content_schema: [
      {
        id: "p1-b1",
        type: "text",
        order: 0,
        content:
          "# Seeing the Pattern\n\nPatterns are everywhere — in nature, in music, in numbers. Recognizing patterns is one of the most powerful skills your brain has.\n\nLook at this sequence: **2, 4, 6, 8, …**\n\nWhat comes next?",
        style: "body",
      },
      {
        id: "p1-b2",
        type: "interactive_slider",
        order: 1,
        label: "Next number in the sequence",
        min: 0,
        max: 20,
        step: 1,
        initial_value: 0,
        correct_value: 10,
      },
      {
        id: "p1-b3",
        type: "multiple_choice",
        order: 2,
        question: "What's the rule for the pattern 2, 4, 6, 8, 10?",
        options: [
          { id: "a", text: "Add 3 each time" },
          { id: "b", text: "Add 2 each time" },
          { id: "c", text: "Multiply by 2 each time" },
          { id: "d", text: "Add 1, then add 3, alternating" },
        ],
        correct_option_id: "b",
      },
      {
        id: "p1-b4",
        type: "text",
        order: 3,
        content:
          "This is an **arithmetic sequence** — each term increases by the same amount. Patterns like this are the building blocks of mathematics, music, and even computer science.",
        style: "callout",
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
  // Remaining concepts — all locked (prerequisites not yet mastered in demo)
  {
    user_id: "demo-student",
    concept_id: "c-division",
    status: "locked",
    productive_struggle_metric: 0.0,
    total_time_spent_seconds: 0,
    attempts: 0,
    last_accessed_at: null,
    completed_at: null,
  },
  {
    user_id: "demo-student",
    concept_id: "c-fractions",
    status: "locked",
    productive_struggle_metric: 0.0,
    total_time_spent_seconds: 0,
    attempts: 0,
    last_accessed_at: null,
    completed_at: null,
  },
  {
    user_id: "demo-student",
    concept_id: "c-algebra-intro",
    status: "locked",
    productive_struggle_metric: 0.0,
    total_time_spent_seconds: 0,
    attempts: 0,
    last_accessed_at: null,
    completed_at: null,
  },
  {
    user_id: "demo-student",
    concept_id: "c-symmetry",
    status: "locked",
    productive_struggle_metric: 0.0,
    total_time_spent_seconds: 0,
    attempts: 0,
    last_accessed_at: null,
    completed_at: null,
  },
  {
    user_id: "demo-student",
    concept_id: "c-architecture",
    status: "locked",
    productive_struggle_metric: 0.0,
    total_time_spent_seconds: 0,
    attempts: 0,
    last_accessed_at: null,
    completed_at: null,
  },
  {
    user_id: "demo-student",
    concept_id: "c-rhythm",
    status: "locked",
    productive_struggle_metric: 0.0,
    total_time_spent_seconds: 0,
    attempts: 0,
    last_accessed_at: null,
    completed_at: null,
  },
  {
    user_id: "demo-student",
    concept_id: "c-motion",
    status: "locked",
    productive_struggle_metric: 0.0,
    total_time_spent_seconds: 0,
    attempts: 0,
    last_accessed_at: null,
    completed_at: null,
  },
  {
    user_id: "demo-student",
    concept_id: "c-energy",
    status: "locked",
    productive_struggle_metric: 0.0,
    total_time_spent_seconds: 0,
    attempts: 0,
    last_accessed_at: null,
    completed_at: null,
  },
  {
    user_id: "demo-student",
    concept_id: "c-sequences",
    status: "locked",
    productive_struggle_metric: 0.0,
    total_time_spent_seconds: 0,
    attempts: 0,
    last_accessed_at: null,
    completed_at: null,
  },
];

// ============================================
// Seed Data Validation (dev-only)
// Throws on referential integrity errors so
// mismatches are caught at startup, not runtime.
// ============================================

export function validateSeedData(): void {
  if (process.env.NODE_ENV === "production") return;

  const conceptIds = new Set(CONCEPTS.map((c) => c.id));
  const validBlockTypes = new Set([
    "text",
    "interactive_slider",
    "drag_drop_match",
    "formula_builder",
    "multiple_choice",
    "visual_feedback",
  ]);

  // Every prerequisite edge must reference existing concepts
  for (const p of PREREQUISITES) {
    if (!conceptIds.has(p.concept_id))
      throw new Error(
        `validateSeedData: PREREQUISITES references unknown concept_id "${p.concept_id}"`
      );
    if (!conceptIds.has(p.prerequisite_id))
      throw new Error(
        `validateSeedData: PREREQUISITES references unknown prerequisite_id "${p.prerequisite_id}"`
      );
  }

  // Every lesson must reference an existing concept and have valid blocks
  for (const lesson of LESSONS) {
    if (!conceptIds.has(lesson.concept_id))
      throw new Error(
        `validateSeedData: Lesson "${lesson.id}" references unknown concept_id "${lesson.concept_id}"`
      );
    for (const block of lesson.content_schema) {
      if (!validBlockTypes.has(block.type))
        throw new Error(
          `validateSeedData: Block "${block.id}" in lesson "${lesson.id}" has unknown type "${block.type}"`
        );
    }
  }
}

// Run validation immediately in development
if (process.env.NODE_ENV !== "production") {
  validateSeedData();
}
