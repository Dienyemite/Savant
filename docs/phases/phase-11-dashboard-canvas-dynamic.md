# Phase 11 — Dynamic Dashboard & Canvas

Convert the static `/figma-dashboard` and `/figma-canvas` pages into fully dynamic, data-driven pages integrating all existing Savant features.

## Goals
- All 59 UI elements wired to real data or real interactions
- Zero hardcoded fixtures in the two pages
- Auth-gated; redirects to `/onboarding` if no session
- All prior features (InkLayer, TextNoteLayer, SocraticChat, LessonBlockRenderer) accessible from these pages

---

## Sprint 11.1 — Auth Identity in Dashboard

**Goal:** Replace hardcoded "Ava Johnson / ava.johnson@northfield.edu" with the real authenticated user.

**Elements:** User avatar, name, email in sidebar footer (UI#1–3)

**Implementation:**
- Call `supabaseBrowser.auth.getUser()` on mount
- Derive `userInitials` from `display_name` or email prefix
- Render initials div instead of `<img>` unless `avatar_url` is set
- "Sign out" dropdown on ChevronDown click → `supabaseBrowser.auth.signOut()` + `router.push('/onboarding')`

---

## Sprint 11.2 — Dashboard Data Layer (Notebooks + Pages)

**Goal:** Load real notebooks and pages from the API.

**Elements:** Tabs row (UI#10), CLASSES section (UI#7–9), page count badge (UI#14), page cards grid (UI#15–22)

**Implementation:**
- `useEffect` on mount: `fetch('/api/notebooks')` → set `notebooks`
- For each notebook (or selected tab): `fetch('/api/notebooks/${id}/pages')` → accumulate `allPages`
- `activeNotebookId` state (null = "All" tab)
- `displayedPages` = filter by `activeNotebookId` + `searchQuery`
- `sortedPages` = sort by `sortKey` ("last_edited" | "title" | "created")
- Loading skeleton during fetch

---

## Sprint 11.3 — Create Notebook Modal

**Goal:** "New Notebook" button opens a modal; POST creates the notebook.

**Elements:** "New Notebook" button (UI#11), modal form

**Implementation:**
- `showNotebookModal` state
- Modal: title, subject, emoji picker (3 options), learning_mode select
- `POST /api/notebooks` with `{ title, subject, emoji, learning_mode }`
- On success: optimistically prepend notebook to state, close modal, switch to new notebook tab
- Validation: title required

---

## Sprint 11.4 — Create Page Modal

**Goal:** "New Page" button (and "+ Add" in sidebar) opens a modal; POST creates the page.

**Elements:** "New Page" button (UI#12), modal form, sidebar "+ Add class" (UI#9)

**Implementation:**
- `showPageModal` state
- Modal: title, topic (optional), notebookId select (pre-fills with `activeNotebookId`)
- `POST /api/notebooks/${notebookId}/pages` with `{ title, topic }`
- On success: `router.push('/figma-canvas/${notebookId}/${newPage.id}')`
- Validation: title required, notebook required

---

## Sprint 11.5 — Search + Cmd+K

**Goal:** Search input filters displayed pages in real-time; Cmd+K focuses the input.

**Elements:** Search input (UI#13), Cmd+K hint badge

**Implementation:**
- `searchQuery` controlled state
- `displayedPages` memo includes `title.toLowerCase().includes(searchQuery.toLowerCase())`
- `useEffect` adds `keydown` listener: `e.metaKey && e.key === 'k'` → `inputRef.current?.focus()`
- `e.key === 'Escape'` clears search and blurs

---

## Sprint 11.6 — Sort + View Toggle

**Goal:** Sort dropdown changes page order; grid/list toggle switches card layout.

**Elements:** "Sort by" dropdown (UI#23), grid/list toggle (UI#24)

**Implementation:**
- `sortKey: 'last_edited' | 'title' | 'created'` state
- `viewMode: 'grid' | 'list'` state
- Sort dropdown: three options with checkmark on active
- Grid = existing 4-col grid; List = 1-col rows with less height
- Dropdown closes on outside click (`useRef` + `useEffect`)

---

## Sprint 11.7 — Page Card Actions (Pin, Star, Context Menu)

**Goal:** Pin, star, and context menu (rename, delete) work on each page card.

**Elements:** Pin button (UI#16), Star button (UI#17), context menu (UI#18) on each PageCard

**DB Requirement:** Pages table needs `is_pinned BOOLEAN DEFAULT false` and `is_favorited BOOLEAN DEFAULT false` columns → migration 003.

**Implementation:**
- `PATCH /api/pages/[id]` endpoint: accepts `{ is_pinned?, is_favorited?, title? }`
- Pin: toggle `is_pinned` → PATCH → optimistic local update
- Star: toggle `is_favorited` → PATCH → optimistic local update
- Context menu: "Rename" → inline title edit; "Delete" → `DELETE /api/pages/[id]` + remove from state
- Context menu closes on outside click

---

## Sprint 11.8 — Widgets (Recent, Favorites, Activity)

**Goal:** Widget panels show real data from loaded pages.

**Elements:** Recent notes widget (UI#26–27), Favorites widget (UI#28–29), Activity widget (UI#30)

**Implementation:**
- Recent: sort `allPages` by `updated_at` desc, take first 5
- Favorites: filter `allPages` where `is_favorited === true`, take first 4
- Activity: derive synthetic log from pages (last edited entries)
- "View all" → sets `activeNotebookId` to null and scrolls to grid

---

## Sprint 11.9 — Canvas Dynamic Route Structure

**Goal:** Create `/figma-canvas/[notebookId]/[pageId]/page.tsx` that loads real data.

**Elements:** All canvas UI elements (UI#31–59)

**Implementation:**
- New file: `src/app/figma-canvas/[notebookId]/[pageId]/page.tsx`
- Extract `notebookId`, `pageId` from params via `useParams()`
- `fetch('/api/pages/${pageId}')` → set `page` and `notebook`
- `fetch('/api/notebooks/${notebookId}/pages')` → set `notebookPages`
- Loading skeleton; 404 redirect on not found
- Static canvas at `/figma-canvas` remains as a demo/preview

---

## Sprint 11.10 — Canvas Pages Sidebar

**Goal:** Pages sidebar shows real pages; clicking navigates; "+ New page" creates one.

**Elements:** Pages list in secondary sidebar (UI#33–35), new page button (UI#36)

**Implementation:**
- Render `notebookPages` as `PageItem` list
- Active page highlighted (matches `pageId` param)
- Click page → `router.push('/figma-canvas/${notebookId}/${page.id}')`
- "+ New page" → `POST /api/notebooks/${notebookId}/pages` with title "Untitled Page" → navigate to new page

---

## Sprint 11.11 — Breadcrumb + Save Indicator

**Goal:** Breadcrumb shows real notebook/page titles; inline page title edit; save indicator.

**Elements:** Breadcrumb (UI#37–39), save indicator (UI#40), Share button (UI#41)

**Implementation:**
- Notebook name links to `/figma-dashboard` (with notebook tab pre-selected via query param)
- Page title: click to edit inline (contenteditable span) → blur triggers `PATCH /api/pages/${pageId}` with new title
- Save indicator: "Saving..." / "Saved" / "Error" states; debounced 800ms after any change
- Share button: `navigator.clipboard.writeText(window.location.href)` + brief "Copied!" toast

---

## Sprint 11.12 — Floating Toolbar → canvas-store + Undo/Redo

**Goal:** Toolbar buttons update `useCanvasStore`; undo/redo manage stroke history.

**Elements:** All toolbar buttons (UI#42–54)

**Implementation:**
- Replace local `activeTool` state with `useCanvasStore(s => s.activeTool)` + `setActiveTool`
- Map toolbar buttons to `CanvasTool` values: select, pen, eraser, text
- Keyboard shortcuts: `v`=select, `p`=pen, `e`=eraser, `t`=text
- Undo: maintain `undoStack` in component state (or store extension); `clearStrokes` + replay
- Redo: `redoStack`

---

## Sprint 11.13 — Lesson Content Area + Generate

**Goal:** Canvas area shows `LessonBlockRenderer` blocks; "Generate" button triggers AI lesson creation.

**Elements:** Canvas content area (UI#55), Generate lesson button, lesson blocks

**Implementation:**
- If `page.lesson_content` exists: render each block via `<LessonBlockRenderer block={block} />`
- If not: show "No lesson yet" empty state with "Generate Lesson" button
- Generate: `POST /api/pages/${pageId}/generate-lesson` → poll / stream → set `lessonContent` on completion
- Loading state while generating

---

## Sprint 11.14 — InkLayer + TextNoteLayer + Auto-save

**Goal:** Drawing tools work on the canvas; state is restored and auto-saved.

**Elements:** Drawing area overlay (UI#56–57)

**Implementation:**
- Mount `<InkLayer />` and `<TextNoteLayer />` overlaid on canvas content
- On page load: if `page.canvas_state` exists → call `hydrateCanvas(strokes, textNotes)`
- Auto-save: 2s debounce after any stroke commit → `PUT /api/pages/${pageId}/canvas` with current strokes+notes
- Save indicator syncs to auto-save status

---

## Sprint 11.15 — SocraticChat

**Goal:** SocraticChat panel opens/closes from canvas; aware of current lesson context.

**Elements:** HelpCircle button / chat toggle (UI#58)

**Implementation:**
- Mount `<SocraticChat />` (self-contained, uses `useChatStore`)
- HelpCircle button in canvas header calls `openChat()` / `toggleChat()`
- Pass `lessonContext` to lesson store so chat is aware of current page topic

---

## Sprint 11.16 — Zoom + Bottom Controls

**Goal:** Zoom in/out/fit buttons and minimap work.

**Elements:** Zoom controls (UI#59), bottom bar, minimap placeholder

**Implementation:**
- `zoom` state (default 1.0), min 0.25, max 3.0
- Apply `transform: scale(zoom)` with `transform-origin: top center` on canvas content wrapper
- `+` / `-` / fit buttons update zoom
- Bottom bar shows zoom %, page count indicator, minimap toggle button
- Cmd+= / Cmd+- keyboard shortcuts

---

## Sprint 11.17 — Middleware Auth Guard

**Goal:** Both figma routes redirect to `/onboarding` without a session.

**Implementation:**
- Add `pathname.startsWith('/figma-dashboard') || pathname.startsWith('/figma-canvas')` to `isProtected` check in `middleware.ts`

---

## Design System Constraints

- Background: `bg-black` only; NO color accents
- Borders: `border-white` or `border-white/20`
- Text: `text-white`, `text-white/70`, `text-white/50`
- Dot-grid background: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)` / `24px 24px`
- Zustand: one selector per value — `useCanvasStore(s => s.activeTool)` only
- React 19 cloneElement icons: `React.ReactElement<{ className?: string }>`
- Tailwind v4: `shrink-0` (not `flex-shrink-0`)
