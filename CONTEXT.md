# Savant

An AI-powered adaptive learning platform where students explore interconnected knowledge through an interactive constellation graph, tactile ink canvas, and Socratic AI tutor.

## Language

**Concept**:
A single learnable idea represented as a node in the Constellation. Concepts carry a difficulty level, a domain, and optional prerequisites that must be mastered before the Concept is unlocked.
_Avoid_: Topic, Subject, Node, Skill, Unit

**Domain**:
A broad subject category that classifies a Concept. One of `STEM`, `humanities`, `languages`, `arts`, or `social_sciences`. Used to group Concepts visually in the Constellation and to provide context to the Socratic Chat.
_Avoid_: Category, Subject area, Discipline, Field, Topic

**Constellation**:
The full knowledge graph rendered as a navigable, animated canvas. Displays each Concept's current Progress Status and lets students launch Lessons. Unlocking is driven by Progress, not by navigation.
_Avoid_: Graph, Map, Knowledge map, Mind map, Dashboard

**Lesson**:
An interactive learning session attached to a Concept, composed of an ordered sequence of Blocks. Completing all Blocks in a Lesson advances the student's Progress on that Concept.
_Avoid_: Course, Tutorial, Module, Session, Unit

**Block**:
A single typed content unit within a Lesson. Block types include: `text`, `multiple_choice`, `interactive_slider`, `drag_drop_match`, `formula_builder`, `playground`, `visual_feedback`, `analogy`, `step_trace`, `sketch`, `timeline`, `quote_analysis`, `key_terms`, and `worked_example`. Each Block may carry a correct state that the student must reach to advance.
_Avoid_: Slide, Step, Widget, Section, Item, Card

**Canvas**:
The shared drawing surface overlaid on a Lesson page or the Constellation. Stores Strokes and text notes per user. Each Lesson page and the Constellation each have independent Canvas state.
_Avoid_: Sketchpad, Drawing layer, Whiteboard, Ink surface

**Stroke**:
A single continuous mark drawn on the Canvas using a pointer device. A Stroke carries pressure samples, position data, and a tool type (`pen`, `highlight`, or `eraser`).
_Avoid_: Line, Path, Mark, Brush stroke, Ink mark

**Progress**:
A student's mastery record on a specific Concept, persisted per user. Each Concept a student has interacted with has exactly one Progress record carrying a Progress Status.
_Avoid_: Status, State, Level, Score, Completion, Grade

**Progress Status**:
The current mastery stage within a Progress record. One of `locked` (prerequisites not met), `unlocked` (accessible but not yet mastered), or `mastered` (Lesson completed).
_Avoid_: Progress, Status, State

**Prerequisite**:
A directed dependency between two Concepts. If Concept B has Concept A as a Prerequisite, A must be mastered before B is unlocked in the Constellation.
_Avoid_: Dependency, Requirement, Blocker, Parent concept

**Socratic Chat**:
The AI tutor conversation surface attached to a Lesson. The tutor responds using guided questions rather than direct answers. Student-initiated queries from text selection appear as Socratic Notes in the margin.
_Avoid_: Chat, AI Chat, Tutor, Assistant, Bot, Copilot

**Annotation**:
Marginalia auto-generated when a student draws a highlight stroke over Lesson text. The AI responds as a professor's margin note — an unsolicited insight, not a reply to a question. Created without any student prompt.
_Avoid_: Comment, Note, Highlight, Marginal note, Highlight annotation

**Socratic Note**:
Marginalia created when a student explicitly selects text in a Lesson and triggers the Socratic Chat. Unlike an Annotation, a Socratic Note is student-initiated — the student asked; the tutor responds.
_Avoid_: Annotation, Selection note, Chat reply, AI response

**Marginalia**:
The right-margin column in a Lesson page that displays Annotations and Socratic Notes, each positioned beside the text that triggered them.
_Avoid_: Sidebar, Panel, Annotation panel, Comment thread

**Focus Score**:
A per-session engagement metric computed when a Lesson is completed. Measures how productively the student struggled — accounting for attempt counts, block completions, and time spent. Shown on the Lesson completion screen.
_Avoid_: Points, XP, Score, Rating, Streak
