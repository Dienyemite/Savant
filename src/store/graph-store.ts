import { create } from "zustand";
import {
  Concept,
  ConceptNode,
  ConceptPrerequisite,
  Lesson,
  ProgressStatus,
} from "@/types";
import { CONCEPTS, PREREQUISITES, LESSONS, DEFAULT_PROGRESS } from "@/data/seed";

// ============================================
// Knowledge Graph Store
// ============================================

interface GraphState {
  // Data
  concepts: Concept[];
  prerequisites: ConceptPrerequisite[];
  lessons: Lesson[];
  progressMap: Map<string, ProgressStatus>;

  // UI State
  selectedConceptId: string | null;
  isLessonModalOpen: boolean;

  // Mastery animation state
  recentlyMasteredId: string | null;
  recentlyUnlockedIds: string[];

  // Derived
  getConceptNode: (id: string) => ConceptNode | undefined;
  getConceptLessons: (conceptId: string) => Lesson[];
  getPrerequisitesFor: (conceptId: string) => Concept[];
  getUnlockedBy: (conceptId: string) => Concept[];

  // Actions
  selectConcept: (id: string | null) => void;
  openLessonModal: (conceptId: string) => void;
  closeLessonModal: () => void;
  updateProgress: (conceptId: string, status: ProgressStatus) => void;
  clearMasteryAnimation: () => void;
  /**
   * Seeds the progress map based on the user's onboarding selections.
   * Called from page.tsx after the user completes /onboarding.
   * Phase 6 will replace this with data loaded from Supabase.
   */
  applyUserPreferences: (prefs: {
    path: "self" | "k12" | "college";
    gradeLevel: number | null;
    major: string | null;
    subject: string | null;
  }) => void;
}

// Build initial progress map from seed data
function buildInitialProgressMap(): Map<string, ProgressStatus> {
  const map = new Map<string, ProgressStatus>();

  // Set all concepts as locked initially
  for (const concept of CONCEPTS) {
    map.set(concept.id, "locked");
  }

  // Apply demo progress overrides
  for (const progress of DEFAULT_PROGRESS) {
    map.set(progress.concept_id, progress.status);
  }

  return map;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  concepts: CONCEPTS,
  prerequisites: PREREQUISITES,
  lessons: LESSONS,
  progressMap: buildInitialProgressMap(),

  selectedConceptId: null,
  isLessonModalOpen: false,
  recentlyMasteredId: null,
  recentlyUnlockedIds: [],

  getConceptNode: (id: string) => {
    const state = get();
    const concept = state.concepts.find((c) => c.id === id);
    if (!concept) return undefined;

    const prereqs = state.prerequisites
      .filter((p) => p.concept_id === id)
      .map((p) => p.prerequisite_id);

    const unlocks = state.prerequisites
      .filter((p) => p.prerequisite_id === id)
      .map((p) => p.concept_id);

    return {
      concept,
      status: state.progressMap.get(id) ?? "locked",
      prerequisites: prereqs,
      unlocks,
    };
  },

  getConceptLessons: (conceptId: string) => {
    return get()
      .lessons.filter((l) => l.concept_id === conceptId)
      .sort((a, b) => a.order - b.order);
  },

  getPrerequisitesFor: (conceptId: string) => {
    const state = get();
    const prereqIds = state.prerequisites
      .filter((p) => p.concept_id === conceptId)
      .map((p) => p.prerequisite_id);
    return state.concepts.filter((c) => prereqIds.includes(c.id));
  },

  getUnlockedBy: (conceptId: string) => {
    const state = get();
    const unlockIds = state.prerequisites
      .filter((p) => p.prerequisite_id === conceptId)
      .map((p) => p.concept_id);
    return state.concepts.filter((c) => unlockIds.includes(c.id));
  },

  selectConcept: (id) => set({ selectedConceptId: id }),

  openLessonModal: (conceptId) =>
    set({ selectedConceptId: conceptId, isLessonModalOpen: true }),

  closeLessonModal: () => set({ isLessonModalOpen: false }),

  updateProgress: (conceptId, status) =>
    set((state) => {
      const newMap = new Map(state.progressMap);
      newMap.set(conceptId, status);

      const newlyUnlocked: string[] = [];

      // If concept is now mastered, unlock concepts that have all prerequisites mastered
      if (status === "mastered") {
        const potentialUnlocks = state.prerequisites
          .filter((p) => p.prerequisite_id === conceptId)
          .map((p) => p.concept_id);

        for (const unlockId of potentialUnlocks) {
          const allPrereqs = state.prerequisites
            .filter((p) => p.concept_id === unlockId)
            .map((p) => p.prerequisite_id);

          const allMastered = allPrereqs.every(
            (pid) => newMap.get(pid) === "mastered"
          );

          if (allMastered && newMap.get(unlockId) === "locked") {
            newMap.set(unlockId, "unlocked");
            newlyUnlocked.push(unlockId);
          }
        }
      }

      return {
        progressMap: newMap,
        recentlyMasteredId: status === "mastered" ? conceptId : null,
        recentlyUnlockedIds: newlyUnlocked,
      };
    }),

  clearMasteryAnimation: () =>
    set({ recentlyMasteredId: null, recentlyUnlockedIds: [] }),

  applyUserPreferences: (prefs) => {
    const state = get();
    const newMap = new Map(state.progressMap);

    // Determine which concept domains to unlock based on path and selections.
    // Root concepts (no prerequisites) for the matching domains become "unlocked".
    const rootConceptIds = state.concepts
      .filter((c) => !state.prerequisites.some((p) => p.concept_id === c.id))
      .map((c) => c.id);

    if (prefs.path === "self") {
      // Self-learning: unlock all root concepts
      for (const id of rootConceptIds) {
        newMap.set(id, "unlocked");
      }
    } else if (prefs.path === "k12") {
      const grade = prefs.gradeLevel ?? 1;
      // Grades 1–3: math + language roots only
      // Grades 4–6: math + language + science roots
      // Grades 7–12: all roots for the selected subject domains
      const domainsForGrade =
        grade <= 3
          ? ["math", "language"]
          : grade <= 6
          ? ["math", "language", "science"]
          : ["math", "language", "science", "logic"];

      for (const id of rootConceptIds) {
        const concept = state.concepts.find((c) => c.id === id);
        if (concept && domainsForGrade.includes(concept.domain)) {
          newMap.set(id, "unlocked");
        }
      }
    } else if (prefs.path === "college") {
      // College: unlock all root concepts (full constellation visible)
      for (const id of rootConceptIds) {
        newMap.set(id, "unlocked");
      }
    }

    set({ progressMap: newMap });
  },
}));
