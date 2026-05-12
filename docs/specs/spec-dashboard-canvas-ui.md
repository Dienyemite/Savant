# Spec — Dashboard & Canvas UI Elements

All 59 interactive UI elements across `/figma-dashboard` and `/figma-canvas/[notebookId]/[pageId]`.

---

## Dashboard (`/figma-dashboard`)

### Sidebar

| # | Element | Static State | Dynamic Behaviour |
|---|---------|-------------|-------------------|
| 1 | User avatar | Hardcoded Unsplash image | Real `avatar_url` from Supabase; initials fallback |
| 2 | User display name | "Ava Johnson" | `user.user_metadata.display_name` or email prefix |
| 3 | User email | "ava.johnson@northfield.edu" | `user.email` |
| 4 | Workspace switcher (ChevronDown) | Static | Sign-out dropdown |
| 5 | Notebooks nav item | Active styling hardcoded | Active when `activeSection === 'notebooks'` |
| 6 | All Pages / Favorites / Shared / Trash | Buttons do nothing | Will set `activeSection`; Trash shows deleted pages |
| 7 | CLASSES section header | Static | Count of notebooks |
| 8 | Class items (Physics, Calc…) | Hardcoded 4 classes | Real notebooks from API; click = filter tab |
| 9 | "+ Add class" button | Does nothing | Opens Create Notebook modal |

### Header

| # | Element | Static State | Dynamic Behaviour |
|---|---------|-------------|-------------------|
| 10 | Search input | Uncontrolled | Controlled → filters `displayedPages` |
| 11 | Cmd+K hint | Visual only | Focuses input on `Cmd+K` |
| 12 | Bell / notification badge | Static count "3" | Suppressed for now (no notification system) |
| 13 | Header avatars | Static 3 images | Suppressed (no team system) |
| 14 | "New" dropdown button | Does nothing | Opens Create Page modal |

### Content Area — Tabs + Toolbar

| # | Element | Static State | Dynamic Behaviour |
|---|---------|-------------|-------------------|
| 15 | "New Notebook" button | Does nothing | Opens Create Notebook modal |
| 16 | "New Page" button | Links to `/figma-canvas` | Opens Create Page modal |
| 17 | "All" tab | Static active | Clears `activeNotebookId` |
| 18 | Notebook tabs (Physics, Calc…) | Static | Sets `activeNotebookId` |
| 19 | "+ tab" button | Does nothing | Opens Create Notebook modal |
| 20 | Page count badge ("42 pages") | Hardcoded | `displayedPages.length` |
| 21 | "Sort by" dropdown | Does nothing | Cycles `sortKey` |
| 22 | Grid/List toggle | Grid always active | Sets `viewMode` |

### Page Cards

| # | Element | Static State | Dynamic Behaviour |
|---|---------|-------------|-------------------|
| 23 | Page card click | Links to `/figma-canvas` | `router.push('/figma-canvas/${notebookId}/${page.id}')` |
| 24 | Pin button on card | Visual only | `PATCH /api/pages/${id}` toggle `is_pinned` |
| 25 | Star button on card | Visual only | `PATCH /api/pages/${id}` toggle `is_favorited` |
| 26 | Context menu (⋮) on card | Does nothing | Rename / Delete dropdown |
| 27 | Rename action | N/A | Inline title edit → PATCH |
| 28 | Delete action | N/A | `DELETE /api/pages/${id}` + remove from state |

### Widgets

| # | Element | Static State | Dynamic Behaviour |
|---|---------|-------------|-------------------|
| 29 | Recent notes widget | Hardcoded 5 items | Last 5 `allPages` sorted by `updated_at` |
| 30 | Recent note item click | Does nothing | Navigate to canvas page |
| 31 | Recent note pin button | Static | Toggle `is_pinned` |
| 32 | Favorites widget | Hardcoded 4 items | Pages where `is_favorited === true` |
| 33 | Favorite item click | Does nothing | Navigate to canvas page |
| 34 | Activity widget | Hardcoded | Derived from `allPages` updated_at changes |

---

## Canvas (`/figma-canvas/[notebookId]/[pageId]`)

### Primary Sidebar (Icon Strip)

| # | Element | Static State | Dynamic Behaviour |
|---|---------|-------------|-------------------|
| 35 | Logo/home button | Links to `/figma-dashboard` | Same |
| 36 | Pages icon | Active | Toggles secondary sidebar |
| 37 | Templates / Elements / Images / Search icons | Do nothing | Suppressed for now |
| 38 | Settings icon | Does nothing | Suppressed |
| 39 | Trash icon | Does nothing | Suppressed |

### Secondary Sidebar (Pages List)

| # | Element | Static State | Dynamic Behaviour |
|---|---------|-------------|-------------------|
| 40 | Pages header | Static | Shows notebook title |
| 41 | Page items list | Hardcoded 5 pages | Real `notebookPages` from API |
| 42 | Active page highlight | Hardcoded page 1 | Matches `pageId` param |
| 43 | Page item click | Does nothing | `router.push` to that page |
| 44 | "+ New page" button | Does nothing | POST new page → navigate |

### Header / Breadcrumb

| # | Element | Static State | Dynamic Behaviour |
|---|---------|-------------|-------------------|
| 45 | Notebook name (breadcrumb) | "Physics 201" hardcoded | `notebook.title` → links to dashboard with filter |
| 46 | Page name (breadcrumb) | "Projectile Motion" hardcoded | `page.title`; click to edit inline |
| 47 | Save indicator | "Saved" static | "Saving…" / "Saved" / "Error" states |
| 48 | Header avatars | Static images | Suppressed |
| 49 | Share button | Does nothing | Copies URL to clipboard + toast |

### Floating Toolbar

| # | Element | Static State | Dynamic Behaviour |
|---|---------|-------------|-------------------|
| 50 | Select tool button | Local state | `useCanvasStore` `setActiveTool('select')` + `v` key |
| 51 | Pen tool button | Local state (default pen) | `setActiveTool('pen')` + `p` key |
| 52 | Eraser tool button | Local state | `setActiveTool('eraser')` + `e` key |
| 53 | Text tool button | Local state | `setActiveTool('text')` + `t` key |
| 54 | Shape/Arrow/Image/Sticky/Table/Rect/Calc buttons | Local state, no-op | Set `activeTool` (canvas-store handles unrecognized gracefully) |
| 55 | Undo button | Does nothing | Pop from `undoStack`, replay |
| 56 | Redo button | Does nothing | Pop from `redoStack`, replay |
| 57 | ⋯ More button | Does nothing | Suppressed for now |

### Canvas Content Area

| # | Element | Static State | Dynamic Behaviour |
|---|---------|-------------|-------------------|
| 58 | Static physics content | Hardcoded SVGs | Replaced by `LessonBlockRenderer` blocks |
| 59 | InkLayer overlay | Not mounted | `<InkLayer />` + `<TextNoteLayer />` mounted over canvas |
| 60 | HelpCircle / Socratic chat toggle | Not present | Calls `openChat()` from `useChatStore` |
| 61 | Zoom controls | Not present | `zoom` state, `transform: scale()`, keyboard shortcuts |

---

## API Changes Required

| Endpoint | Change |
|----------|--------|
| `PATCH /api/pages/[id]` | New endpoint: accepts `{ title?, is_pinned?, is_favorited? }` |
| `DELETE /api/pages/[id]` | New endpoint: deletes page owned by user |
| DB migration 003 | Add `is_pinned BOOLEAN DEFAULT false`, `is_favorited BOOLEAN DEFAULT false` to `pages` |

---

## Component Mount Map

```
figma-canvas/[notebookId]/[pageId]/page.tsx
  ├── <SocraticChat />          — fixed z-50, opened via useChatStore.openChat()
  ├── canvas content div
  │     ├── <LessonBlockRenderer block={b} />   — for each lesson_content block
  │     ├── <InkLayer />                        — drawing overlay
  │     └── <TextNoteLayer />                   — text note overlay
  └── zoom wrapper (transform: scale(zoom))
```
