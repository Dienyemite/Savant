# Savant

An AI-powered adaptive learning platform where students explore interconnected knowledge through an interactive constellation graph, tactile ink canvas, and Socratic AI tutor.

## Language

**Concept**:
A single learnable idea represented as a node in the Constellation. Concepts carry a difficulty level, a domain, and optional prerequisites that must be mastered before the Concept is unlocked.
_Avoid_: Topic, Subject, Node, Skill, Unit

**Constellation**:
The full knowledge graph rendered as a navigable, animated canvas. Students move through the Constellation to discover and unlock Concepts.
_Avoid_: Graph, Map, Knowledge map, Mind map, Dashboard

**Lesson**:
An interactive learning session attached to a Concept, composed of an ordered sequence of Blocks. Completing all Blocks in a Lesson advances the student's Progress on that Concept.
_Avoid_: Course, Tutorial, Module, Session, Unit

**Block**:
A single typed content unit within a Lesson. Block types include: `text`, `multiple_choice`, `interactive_slider`, `drag_drop_match`, `formula_builder`, `playground`, and `visual_feedback`. Each Block may carry a correct state that the student must reach to advance.
_Avoid_: Slide, Step, Widget, Section, Item, Card

**Canvas**:
The shared drawing surface overlaid on a Lesson page or the Constellation. Stores Strokes and text notes per user. Each Lesson page and the Constellation each have independent Canvas state.
_Avoid_: Sketchpad, Drawing layer, Whiteboard, Ink surface

**Stroke**:
A single continuous mark drawn on the Canvas using a pointer device. A Stroke carries pressure samples, position data, and a tool type (`pen`, `highlighter`, or `eraser`).
_Avoid_: Line, Path, Mark, Brush stroke, Ink mark

**Progress**:
The mastery status of a student on a specific Concept. One of `locked` (prerequisites not met), `unlocked` (accessible but not mastered), or `mastered` (Lesson completed).
_Avoid_: Status, State, Level, Score, Completion, Grade

**Prerequisite**:
A Concept that must be mastered before a given Concept is unlocked in the Constellation. Prerequisites form the directed edges of the knowledge graph.
_Avoid_: Dependency, Requirement, Blocker, Parent concept

**Socratic Chat**:
The AI tutor conversation surface attached to a Lesson. The tutor responds to student messages and highlight Annotations using guided questions rather than direct answers.
_Avoid_: Chat, AI Chat, Tutor, Assistant, Bot, Copilot

**Annotation**:
A piece of marginalia created by selecting text within a Lesson and triggering the Socratic Chat. The Annotation carries the highlighted excerpt as context for the AI response.
_Avoid_: Comment, Note, Highlight, Marginal note, Selection

**Focus Score**:
A cumulative engagement metric that increases as the student completes Lessons, creates Annotations, and draws on the Canvas. Displayed on the student's profile.
_Avoid_: Points, XP, Score, Rating, Streak
