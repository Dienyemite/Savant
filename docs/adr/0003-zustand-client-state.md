# Zustand 5 for client-side state

We use Zustand 5 (not React Context, Redux Toolkit, Jotai, or Recoil) for all client-side application state. State is split into five domain stores:

- `canvas-store` — active strokes, highlights, text notes, tool selection, viewport
- `graph-store` — concept nodes, edge prerequisites, per-concept Progress
- `lesson-store` — current Lesson, current Block index, answer state, completion
- `chat-store` — Socratic Chat message history and loading state
- `telemetry-store` — focus score events and session timing

Each store uses granular Zustand selectors (accessing individual slices rather than the whole store object) so components re-render only when their slice changes.

We chose Zustand because it has minimal boilerplate, no provider wrapping, and composes naturally with React's concurrent rendering model. Redux was rejected for verbosity; Jotai for atom proliferation at scale. Context was ruled out because lesson and canvas state updates are high-frequency (pointer events) and a single Context provider would cause excessive re-renders.
