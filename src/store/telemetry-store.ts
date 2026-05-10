import { create } from "zustand";

// Analytics helper — fire-and-forget, only runs in browser
function analyticsTrack(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  import("@vercel/analytics").then(({ track }) => {
    track(event, props as Record<string, string | number>);
  }).catch(() => {/* analytics unavailable */});
}

// ============================================
// Telemetry Store — "Slow Dopamine" Analytics
// Tracks depth of thought: time-per-slide,
// interaction count, attempt history, and
// productive struggle metrics.
// ============================================

export interface SlideEvent {
  blockId: string;
  blockType: string;
  enteredAt: number; // timestamp ms
  exitedAt: number | null;
  interactions: number; // number of value changes
  attempts: number;
  finalResult: "correct" | "incorrect" | "skipped" | "pending";
}

export interface LessonTelemetry {
  lessonId: string;
  conceptId: string;
  startedAt: number;
  completedAt: number | null;
  totalTimeSeconds: number;
  slideEvents: SlideEvent[];
  productiveStruggleScore: number; // 0-1
}

interface TelemetryState {
  // All completed lesson sessions
  completedSessions: LessonTelemetry[];

  // Current active session tracking
  currentSession: LessonTelemetry | null;
  currentSlideEvent: SlideEvent | null;

  // Actions
  startSession: (lessonId: string, conceptId: string) => void;
  enterSlide: (blockId: string, blockType: string) => void;
  recordInteraction: () => void;
  recordAttempt: (result: "correct" | "incorrect") => void;
  exitSlide: () => void;
  completeSession: () => void;
  resetSession: () => void;

  // Derived
  getConceptMetrics: (conceptId: string) => ConceptMetrics;
  getAllMetrics: () => OverallMetrics;
}

export interface ConceptMetrics {
  conceptId: string;
  totalTimeSeconds: number;
  totalAttempts: number;
  totalInteractions: number;
  averageStruggleScore: number;
  sessionsCompleted: number;
  averageTimePerSlide: number;
}

export interface OverallMetrics {
  totalLessonsCompleted: number;
  totalTimeSeconds: number;
  totalInteractions: number;
  averageStruggleScore: number;
  conceptBreakdown: ConceptMetrics[];
}

/**
 * Compute a productive struggle score (0-1).
 * High score = student spent meaningful time AND made multiple attempts
 * but ultimately succeeded. Low score = gave up quickly or answered instantly.
 */
function computeStruggleScore(events: SlideEvent[]): number {
  if (events.length === 0) return 0;

  const interactiveEvents = events.filter(
    (e) => e.blockType !== "text" && e.blockType !== "visual_feedback"
  );

  if (interactiveEvents.length === 0) return 0.5; // Text-only lesson

  let totalScore = 0;

  for (const event of interactiveEvents) {
    const timeSpent = event.exitedAt
      ? (event.exitedAt - event.enteredAt) / 1000
      : 0;

    // Time component: meaningful engagement (5-120s is ideal range)
    const timeScore = Math.min(1, Math.max(0, timeSpent / 60));

    // Attempt component: some struggle is productive (1-5 attempts ideal)
    const attemptScore =
      event.attempts === 0
        ? 0
        : event.attempts === 1
        ? 0.5
        : Math.min(1, event.attempts / 4);

    // Interaction component: active manipulation shows engagement
    const interactionScore = Math.min(1, event.interactions / 5);

    // Success bonus: struggle that leads to success is most valuable
    const successBonus = event.finalResult === "correct" ? 0.2 : 0;

    const eventScore =
      timeScore * 0.3 +
      attemptScore * 0.3 +
      interactionScore * 0.2 +
      successBonus;

    totalScore += Math.min(1, eventScore);
  }

  return Math.round((totalScore / interactiveEvents.length) * 100) / 100;
}

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  completedSessions: [],
  currentSession: null,
  currentSlideEvent: null,

  startSession: (lessonId, conceptId) => {
    set({
      currentSession: {
        lessonId,
        conceptId,
        startedAt: Date.now(),
        completedAt: null,
        totalTimeSeconds: 0,
        slideEvents: [],
        productiveStruggleScore: 0,
      },
      currentSlideEvent: null,
    });
  },

  enterSlide: (blockId, blockType) => {
    // First, exit previous slide if any
    const prev = get().currentSlideEvent;
    if (prev && !prev.exitedAt) {
      get().exitSlide();
    }

    set({
      currentSlideEvent: {
        blockId,
        blockType,
        enteredAt: Date.now(),
        exitedAt: null,
        interactions: 0,
        attempts: 0,
        finalResult: "pending",
      },
    });
  },

  recordInteraction: () => {
    set((s) => {
      if (!s.currentSlideEvent) return s;
      return {
        currentSlideEvent: {
          ...s.currentSlideEvent,
          interactions: s.currentSlideEvent.interactions + 1,
        },
      };
    });
  },

  recordAttempt: (result) => {
    set((s) => {
      if (!s.currentSlideEvent) return s;
      return {
        currentSlideEvent: {
          ...s.currentSlideEvent,
          attempts: s.currentSlideEvent.attempts + 1,
          finalResult: result,
        },
      };
    });
  },

  exitSlide: () => {
    set((s) => {
      if (!s.currentSlideEvent || !s.currentSession) return s;
      const finalized: SlideEvent = {
        ...s.currentSlideEvent,
        exitedAt: Date.now(),
      };
      return {
        currentSession: {
          ...s.currentSession,
          slideEvents: [...s.currentSession.slideEvents, finalized],
        },
        currentSlideEvent: null,
      };
    });
  },

  completeSession: () => {
    // Exit current slide first
    get().exitSlide();

    set((s) => {
      if (!s.currentSession) return s;
      const now = Date.now();
      const totalTime = Math.round(
        (now - s.currentSession.startedAt) / 1000
      );
      const completed: LessonTelemetry = {
        ...s.currentSession,
        completedAt: now,
        totalTimeSeconds: totalTime,
        productiveStruggleScore: computeStruggleScore(
          s.currentSession.slideEvents
        ),
      };
      return {
        completedSessions: [...s.completedSessions, completed],
        currentSession: null,
        currentSlideEvent: null,
      };
    });
    // Track productive struggle funnel event
    analyticsTrack("struggle_session", {
      conceptId: get().completedSessions.at(-1)?.conceptId ?? "",
      struggleScore: get().completedSessions.at(-1)?.productiveStruggleScore ?? 0,
    });
  },

  resetSession: () => {
    set({ currentSession: null, currentSlideEvent: null });
  },

  getConceptMetrics: (conceptId) => {
    const sessions = get().completedSessions.filter(
      (s) => s.conceptId === conceptId
    );

    if (sessions.length === 0) {
      return {
        conceptId,
        totalTimeSeconds: 0,
        totalAttempts: 0,
        totalInteractions: 0,
        averageStruggleScore: 0,
        sessionsCompleted: 0,
        averageTimePerSlide: 0,
      };
    }

    const totalTime = sessions.reduce(
      (sum, s) => sum + s.totalTimeSeconds,
      0
    );
    const allEvents = sessions.flatMap((s) => s.slideEvents);
    const totalAttempts = allEvents.reduce(
      (sum, e) => sum + e.attempts,
      0
    );
    const totalInteractions = allEvents.reduce(
      (sum, e) => sum + e.interactions,
      0
    );
    const avgStruggle =
      sessions.reduce((sum, s) => sum + s.productiveStruggleScore, 0) /
      sessions.length;

    return {
      conceptId,
      totalTimeSeconds: totalTime,
      totalAttempts,
      totalInteractions,
      averageStruggleScore: Math.round(avgStruggle * 100) / 100,
      sessionsCompleted: sessions.length,
      averageTimePerSlide:
        allEvents.length > 0
          ? Math.round(totalTime / allEvents.length)
          : 0,
    };
  },

  getAllMetrics: () => {
    const sessions = get().completedSessions;
    const concepts = new Set(sessions.map((s) => s.conceptId));

    const conceptBreakdown = Array.from(concepts).map((cId) =>
      get().getConceptMetrics(cId)
    );

    return {
      totalLessonsCompleted: sessions.length,
      totalTimeSeconds: sessions.reduce(
        (sum, s) => sum + s.totalTimeSeconds,
        0
      ),
      totalInteractions: sessions
        .flatMap((s) => s.slideEvents)
        .reduce((sum, e) => sum + e.interactions, 0),
      averageStruggleScore:
        sessions.length > 0
          ? Math.round(
              (sessions.reduce(
                (sum, s) => sum + s.productiveStruggleScore,
                0
              ) /
                sessions.length) *
                100
            ) / 100
          : 0,
      conceptBreakdown,
    };
  },
}));
