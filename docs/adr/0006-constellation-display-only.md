# Constellation is a read-only display layer pending overhaul

**Status**: accepted (the display-only constraint still holds; the planned overhaul remains on the roadmap)

The Constellation currently renders each Concept's Progress Status and lets students launch Lessons. It does not drive any state changes — unlocking is a pure function of Progress, computed in the graph store when a Lesson completes. This keeps the Constellation stateless and replaceable.

The current implementation is intentionally minimal because the Constellation UX is planned for a significant overhaul (spatial layout engine, dynamic edge rendering, richer interaction model). Building deeper logic into the current graph here would be wasted work that the overhaul would have to unpick. Any contributor who finds the Constellation logic surprisingly thin should read this before adding to it.

Note: the Notebook/Page architecture (introduced post-MVP) does not violate this ADR. Notebooks and Pages operate in a separate surface (`/dashboard`, `/notebook`) from the Constellation (`/learn`). The Constellation remains the read-only progress display; lesson generation now happens from Page context, not Constellation context.
