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
          }
        }
      }

      return { progressMap: newMap };
    }),
}));
