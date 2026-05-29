# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — the Savant domain glossary (Concept, Constellation, Lesson, Block, Canvas, Stroke, Progress, Socratic Chat, Annotation, Focus Score).
- **`docs/adr/`** at the repo root — architectural decisions. Read ADRs that touch the area you are about to work in before making any changes.

If any of these files don't exist, proceed silently. Don't flag their absence or suggest creating them upfront — the producer skills (`/grill-with-docs`, `/improve-codebase-architecture`) create them lazily when terms or decisions actually crystallise.

## File structure

Single-context repo:

```
/
├── CONTEXT.md
├── docs/
│   ├── adr/
│   │   ├── 0001-nextjs-app-router.md
│   │   └── ...
│   ├── agents/          ← this directory
│   ├── phases/          ← implementation phase docs
│   └── specs/           ← feature specification docs
└── src/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, refactor proposal, hypothesis, or test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly marks as _Avoid_.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider), or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0003 (Zustand for client state) — but worth reopening because…_
