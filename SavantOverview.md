# SYSTEM DIRECTIVE: AI DEVELOPMENT AGENT INSTRUCTIONS - COMPREHENSIVE (V2)
**Role:** Senior Full-Stack Software Engineer, EdTech Product Architect, and UX/UI Designer.
**Project:** "Savant" - A minimalist, high-focus, interactive learning platform and digital notebook designed to counter cognitive decline through deep, interconnected learning.
**Objective:** Execute the implementation of Savant. This includes a robust full-stack architecture, a novel onboarding flow, a content ingestion engine, and a core UI/UX paradigm functioning as an "Endless Monochrome Notebook" with native stylus support.

**Action:** Read this document thoroughly. This document supersedes all previous directives and introduces a radical UI overhaul based on specific visual references. Wait for the user to prompt "Execute Phase [X]" to begin generating code, architectures, and file structures.

---

# 1. CORE UI/UX PARADIGM: The Endless Monochrome Notebook

The entire Savant experience is conceptualized not as a traditional website, but as a boundless, tactile, physical object translated into a digital space. 

### 1.1. Aesthetic Rules (Strict Enforcement)
*   **Color Palette:** Absolute Monochrome. 
    *   Background: Pure Black (`#000000`).
    *   Text, UI Elements, Lines, Illustrations: Pure White (`#FFFFFF`).
*   **Texture:** The black background MUST have a subtle SVG noise filter applied globally to create a slight grainy effect, mimicking the texture of matte, high-quality black paper.
*   **Glow:** All white elements (text, lines, diagrams) must feature a very subtle CSS `drop-shadow` or `text-shadow` (e.g., `0 0 4px rgba(255,255,255,0.3)`) to give them a slight luminescence against the dark, textured background.
*   **Typography:** 
    *   Body/Academic Text: A highly legible, classic serif font (e.g., Ivy Presto, Merriweather) to evoke the feeling of a printed textbook.
    *   UI Elements/Math: A clean sans-serif or monospaced font.
    *   User Notes: A handwriting-style font (if typed) or native ink (if using a stylus).
*   **No Traditional Navigation:** There are no top nav-bars, hamburger menus, or sidebars. Navigation is achieved entirely through zooming, panning, and contextual interactions within the canvas.

### 1.2. The Landing Page (The Front Cover)
*   **Visuals:** The viewport acts as the front cover of this notebook. It utilizes the textured black background and glowing white text.
*   **Layout:** Centered, minimalist typography. 
*   **Interaction:** The user is presented with the three core paths: "Self-Learning," "K-12," and "College/Undergrad."
*   **Flow:** Upon selecting a path, the relevant input prompts (Grade level, Major, Subject Search) appear directly on this "cover." Once a subject is selected, a full-screen transition occurs, simulating opening the notebook.

### 1.3. The Notebook Page (The Endless Canvas)
*   **Visuals:** The background is the textured black. It features a faint, glowing white grid or horizontal ruled lines (like a moleskine notebook). 
*   **Structure:** This is not a scrolling webpage; it is an **Infinite Canvas** (conceptually similar to Miro, Figma, or Obsidian). The user can pan infinitely in any direction and zoom in/out continuously.
*   **Content Presentation:** When a subject is initiated, the introductory text and interactive elements are rendered directly onto this canvas, styled like the layout of a classic, dense academic book. 
*   **Illustrations:** Visuals generated from the ingested content must be rendered as minimalist, white-line sketches or geometric diagrams directly on the black canvas.
*   **User Interaction (The Notebook Experience):**
    *   **Panning/Zooming:** The primary way to move through content.
    *   **Typing:** Clicking anywhere empty on the canvas spawns a cursor, allowing the user to type notes anywhere, next to or around the academic content.
    *   **Stylus/Inking:** Native support via the Pointer Events API. Users can draw, annotate, and write equations directly over the text, diagrams, and empty space. The "ink" is glowing white.

---

# 2. CORE FEATURES REVISED FOR THE CANVAS

### 2.1. The Diagnostic Crucible (Onboarding)
For K-12 students, the placement test is not a separate page. It appears as a dedicated "block" of content on the infinite canvas. The user solves the problems directly on the canvas using text or stylus. 

### 2.2. The Interactive Transformation (Content)
*   The ingested OER content (text, widgets, Socratic questions) is rendered as grouped objects on the canvas. 
*   Interactive widgets (e.g., a physics slider) are functional components embedded within the canvas structure, responding to user interaction while the user can simultaneously draw notes pointing to them.

### 2.3. The Socratic AI Tutor
*   **Interface:** The tutor is not a traditional chat box. It is invoked contextually. If a user selects an area of text, a diagram, or their own handwritten notes, they can trigger the tutor. The tutor's responses appear as "marginalia"—text generated next to the content being queried.
*   **Context:** The LLM receives the visual context of the selected canvas area and the associated lesson data to provide guidance without giving the answer.

### 2.4. The Knowledge Constellation
*   **Interface:** Because navigation is spatial, the Knowledge Constellation exists at a specific, highly zoomed-out level of the infinite canvas. 
*   **Mechanics:** Zooming out far enough transitions the view from the detailed lesson text into the macro-view of the constellation. Nodes are mapped spatially on the dark background. Zooming into a node enters that specific lesson "page."

---

# 3. TECHNICAL ARCHITECTURE

## 3.1. Tech Stack
*   **Frontend Framework:** Next.js (React), TypeScript.
*   **Infinite Canvas Engine:** Fabric.js, PixiJS, or a robust custom HTML5 Canvas/WebGL implementation. *This is the most critical technical decision. It must handle infinite panning, zooming, text rendering, and high-performance freehand drawing simultaneously.*
*   **Stylus Integration:** Perfect-Freehand (for smooth ink rendering) coupled with Pointer Events API (handling pressure and tilt).
*   **Styling:** Tailwind CSS (primarily for the landing page and overlay elements, as the core app is canvas-based).
*   **Backend:** Node.js (Next.js API routes) or Python/FastAPI.
*   **Database:** PostgreSQL (Supabase or Vercel Postgres).
*   **Authentication:** NextAuth.js or Supabase Auth.
*   **AI Integration:** Gemini or Anthropic Claude 3.5 Sonnet.

## 3.2. Data Models (Core Schema Updates)

*The standard User, Concept, and ContentSource models remain.*

**1. `CanvasState` (Replaces `NotebookPage`)**
*   `id` (UUID, Primary Key)
*   `user_id` (UUID, Foreign Key)
*   `concept_id` (UUID, Foreign Key)
*   `elements` (JSONB) - A complex object storing the serialized state of the canvas. This includes:
    *   `lesson_blocks` (Position, scale, and content of ingested text/widgets).
    *   `user_text_notes` (Position, content, font settings).
    *   `user_ink_strokes` (Array of SVG paths or coordinate arrays representing stylus drawings).
*   `viewport` (JSON) - The user's last saved X/Y pan position and zoom level.

---

# 4. IMPLEMENTATION PLAN (PHASES FOR AI EXECUTION)

*AI AGENT: Acknowledge the shift to an Infinite Canvas architecture. All UI must be built with this spatial paradigm in mind. When the user prompts you to execute a phase, follow these instructions precisely.*

### Phase 1: Infrastructure & The Canvas Foundation
1.  **Project Initialization:** Next.js, TypeScript. Set global CSS variables for the strict `#000000` background, `#FFFFFF` text/lines, and the glowing text-shadow. Implement the SVG noise filter globally.
2.  **Canvas Setup:** Initialize the chosen canvas library (e.g., Fabric.js). Implement the core mechanics: Infinite panning (middle-click drag or space+drag) and smooth zooming (scroll wheel/pinch).
3.  **The Grid:** Render the glowing white ruled lines or grid pattern dynamically onto the canvas background, ensuring it scales correctly with zoom.

### Phase 2: The Landing Page & Onboarding (The Cover)
1.  Build the Landing Page as an HTML/CSS overlay *on top* of the canvas, styled as the notebook cover.
2.  Implement the selection logic (Self, K-12, College) and the associated input fields.
3.  Implement a seamless transition that hides the overlay and reveals the canvas when a subject is selected.
4.  **Database/Auth:** Implement PostgreSQL schemas and user authentication (Supabase/NextAuth).

### Phase 3: Tactile Interaction (Ink & Text)
1.  **Stylus Support:** Implement `perfect-freehand` within the canvas engine. Capture pointer events to allow users to draw glowing white ink anywhere. Ensure strokes are saved to the local canvas state.
2.  **Free-form Typing:** Implement an event listener where a single click on an empty canvas space spawns a text input box. Once typing is complete, render that text permanently onto the canvas layer.
3.  **Serialization:** Write the functions to serialize the entire canvas state (ink, text, positions) into JSON and save it to the `CanvasState` database table.

### Phase 4: Content Ingestion & Rendering
1.  **LLM Pipeline:** Build the backend service to ingest educational text and output the structured JSON schema (text chunks, widget parameters).
2.  **Canvas Rendering:** Write the logic to take that JSON schema and render it as formatted text blocks and interactive widget objects *directly onto the canvas coordinate system*. 
3.  **Styling:** Ensure the rendered academic text uses the specified serif font and resembles the layout of a classic textbook page embedded in the dark space.

### Phase 5: Socratic AI & The Constellation
1.  **Contextual Tutor:** Implement the UI to select a region of the canvas. Send the data within that region (text, user ink coordinates) to the LLM. Render the LLM's Socratic response as a new text object near the selection.
2.  **The Macro View:** Implement the Knowledge Constellation. When the user zooms out past a specific threshold, fade out the detailed lesson content and fade in the node-based graph. Implement logic allowing users to pan around the graph and zoom into a node to load that specific `CanvasState`.

---
**[END OF INSTRUCTIONS]**
**USER READY.** (AI Agent: Acknowledge receipt of these instructions, confirm understanding of the Infinite Canvas architecture, the strict monochrome notebook aesthetic, and the stylus integration, and ask the user if they are ready to initiate Phase 1).