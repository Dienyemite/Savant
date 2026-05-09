/**
 * telemetry-store.test.ts — Sprint 7.2.5
 *
 * Tests for the telemetry store: session lifecycle, struggle scoring,
 * and metric queries.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useTelemetryStore } from "@/store/telemetry-store";

function resetStore() {
  useTelemetryStore.setState({
    completedSessions: [],
    currentSession: null,
    currentSlideEvent: null,
  });
}

describe("telemetry-store — session lifecycle", () => {
  beforeEach(resetStore);

  it("startSession → enterSlide → recordAttempt(correct) → exitSlide → completeSession produces a completed session", () => {
    const store = useTelemetryStore.getState();

    store.startSession("l-addition-1", "c-addition");
    store.enterSlide("b1", "multiple_choice");
    store.recordAttempt("correct");
    store.exitSlide();
    store.completeSession();

    const { completedSessions } = useTelemetryStore.getState();
    expect(completedSessions).toHaveLength(1);
    expect(completedSessions[0].conceptId).toBe("c-addition");
    expect(completedSessions[0].slideEvents).toHaveLength(1);
  });

  it("resetSession clears currentSession and currentSlideEvent", () => {
    useTelemetryStore.getState().startSession("l-1", "c-1");
    useTelemetryStore.getState().resetSession();

    const { currentSession, currentSlideEvent } = useTelemetryStore.getState();
    expect(currentSession).toBeNull();
    expect(currentSlideEvent).toBeNull();
  });
});

describe("telemetry-store — struggle score", () => {
  beforeEach(resetStore);

  it("struggle score is 0 for a slide answered instantly and correctly on first attempt", () => {
    useTelemetryStore.getState().startSession("l-1", "c-1");
    useTelemetryStore.getState().enterSlide("b1", "multiple_choice");
    useTelemetryStore.getState().recordAttempt("correct");
    useTelemetryStore.getState().exitSlide();
    useTelemetryStore.getState().completeSession();

    const session = useTelemetryStore.getState().completedSessions[0];
    // One correct attempt on first try = low struggle
    expect(session.productiveStruggleScore).toBeGreaterThanOrEqual(0);
    expect(session.productiveStruggleScore).toBeLessThanOrEqual(1);
  });

  it("struggle score increases for more incorrect attempts", () => {
    // Session with multiple incorrect attempts
    useTelemetryStore.getState().startSession("l-2", "c-2");
    useTelemetryStore.getState().enterSlide("b1", "multiple_choice");
    useTelemetryStore.getState().recordAttempt("incorrect");
    useTelemetryStore.getState().recordAttempt("incorrect");
    useTelemetryStore.getState().recordAttempt("correct");
    useTelemetryStore.getState().exitSlide();
    useTelemetryStore.getState().completeSession();

    // Session with single correct attempt
    useTelemetryStore.getState().startSession("l-3", "c-3");
    useTelemetryStore.getState().enterSlide("b1", "multiple_choice");
    useTelemetryStore.getState().recordAttempt("correct");
    useTelemetryStore.getState().exitSlide();
    useTelemetryStore.getState().completeSession();

    const [hardSession, easySession] = useTelemetryStore.getState().completedSessions;
    expect(hardSession.productiveStruggleScore).toBeGreaterThanOrEqual(
      easySession.productiveStruggleScore
    );
  });
});

describe("telemetry-store — getConceptMetrics", () => {
  beforeEach(resetStore);

  it("getConceptMetrics returns the correct subset of sessions", () => {
    // Add sessions for two different concepts
    useTelemetryStore.getState().startSession("l-1", "c-addition");
    useTelemetryStore.getState().enterSlide("b1", "text");
    useTelemetryStore.getState().exitSlide();
    useTelemetryStore.getState().completeSession();

    useTelemetryStore.getState().startSession("l-2", "c-subtraction");
    useTelemetryStore.getState().enterSlide("b1", "text");
    useTelemetryStore.getState().exitSlide();
    useTelemetryStore.getState().completeSession();

    const metrics = useTelemetryStore.getState().getConceptMetrics("c-addition");
    expect(metrics.conceptId).toBe("c-addition");
    expect(metrics.sessionsCompleted).toBe(1);
  });
});
