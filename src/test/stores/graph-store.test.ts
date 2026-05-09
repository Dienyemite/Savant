/**
 * graph-store.test.ts — Sprint 7.2.2
 *
 * Tests for the graph store: progress updates, auto-unlock logic,
 * mastery animation, prerequisite queries.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useGraphStore } from "@/store/graph-store";
import { CONCEPTS, DEFAULT_PROGRESS } from "@/data/seed";

function buildInitialMap() {
  const map = new Map<string, import("@/types").ProgressStatus>();
  for (const c of CONCEPTS) map.set(c.id, "locked");
  for (const p of DEFAULT_PROGRESS) map.set(p.concept_id, p.status);
  return map;
}

function resetStore() {
  useGraphStore.setState({
    progressMap: buildInitialMap(),
    recentlyUnlockedIds: [],
    recentlyMasteredId: null,
  });
}

describe("graph-store — updateProgress", () => {
  beforeEach(resetStore);

  it("updateProgress sets the status for the given conceptId", () => {
    useGraphStore.getState().updateProgress("c-addition", "mastered");
    expect(useGraphStore.getState().progressMap.get("c-addition")).toBe("mastered");
  });

  it("recentlyMasteredId is set after updateProgress with mastered", () => {
    useGraphStore.getState().updateProgress("c-addition", "mastered");
    expect(useGraphStore.getState().recentlyMasteredId).toBe("c-addition");
  });

  it("clearMasteryAnimation clears recentlyMasteredId", () => {
    useGraphStore.getState().updateProgress("c-addition", "mastered");
    useGraphStore.getState().clearMasteryAnimation();
    expect(useGraphStore.getState().recentlyMasteredId).toBeNull();
  });
});

describe("graph-store — auto-unlock", () => {
  beforeEach(resetStore);

  it("mastering all prerequisites of a concept unlocks that concept", () => {
    // c-division requires c-multiplication to be mastered
    // c-multiplication starts as "unlocked" in DEFAULT_PROGRESS, c-division as "locked"
    const initial = useGraphStore.getState().progressMap.get("c-division");
    expect(initial).toBe("locked");

    // Master multiplication (the prerequisite of division)
    useGraphStore.getState().updateProgress("c-multiplication", "mastered");

    // After mastering multiplication, division should be unlocked
    const afterMastery = useGraphStore.getState().progressMap.get("c-division");
    expect(afterMastery).toBe("unlocked");
  });
});

describe("graph-store — prerequisite queries", () => {
  it("getPrerequisitesFor returns correct prerequisite concept IDs", () => {
    const prereqs = useGraphStore.getState().getPrerequisitesFor("c-subtraction");
    expect(Array.isArray(prereqs)).toBe(true);
    const ids = prereqs.map((c) => c.id);
    expect(ids).toContain("c-addition");
  });

  it("getUnlockedBy returns concepts unlocked by mastering a concept", () => {
    const unlocked = useGraphStore.getState().getUnlockedBy("c-addition");
    expect(Array.isArray(unlocked)).toBe(true);
    const ids = unlocked.map((c) => c.id);
    expect(ids).toContain("c-subtraction");
  });
});

describe("graph-store — hydrateProgress", () => {
  beforeEach(resetStore);

  it("overlays DB records over seed defaults", () => {
    useGraphStore.getState().hydrateProgress([
      { conceptId: "c-addition", status: "mastered" },
    ]);
    expect(useGraphStore.getState().progressMap.get("c-addition")).toBe("mastered");
  });
});
