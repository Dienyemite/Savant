/**
 * chat-store.test.ts — Sprint 7.2.4
 *
 * Tests for the chat store: Socratic chat lifecycle and
 * marginalia entry management.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useChatStore } from "@/store/chat-store";

function resetStore() {
  useChatStore.setState({
    isOpen: false,
    isMinimized: false,
    hasBeenTriggered: false,
    messages: [],
    isStreaming: false,
    marginaliaEntries: [],
  });
}

describe("chat-store — marginalia entries", () => {
  beforeEach(resetStore);

  it("addMarginaliaEntry returns a unique ID and adds an entry with isStreaming: true", () => {
    const id = useChatStore.getState().addMarginaliaEntry(100, "some selected text");
    expect(typeof id).toBe("string");
    const entry = useChatStore.getState().marginaliaEntries.find((e) => e.id === id);
    expect(entry).toBeDefined();
    expect(entry!.isStreaming).toBe(true);
    expect(entry!.selectedText).toBe("some selected text");
  });

  it("addMarginaliaEntry IDs are unique across calls", () => {
    const id1 = useChatStore.getState().addMarginaliaEntry(50, "text 1");
    const id2 = useChatStore.getState().addMarginaliaEntry(60, "text 2");
    expect(id1).not.toBe(id2);
  });

  it("updateMarginalia appends content to the correct entry", () => {
    const id = useChatStore.getState().addMarginaliaEntry(100, "selected text");
    useChatStore.getState().updateMarginalia(id, "AI response chunk");
    const entry = useChatStore.getState().marginaliaEntries.find((e) => e.id === id);
    expect(entry!.content).toBe("AI response chunk");
  });

  it("finishMarginalia sets isStreaming: false on the correct entry", () => {
    const id = useChatStore.getState().addMarginaliaEntry(100, "text");
    useChatStore.getState().updateMarginalia(id, "full response");
    useChatStore.getState().finishMarginalia(id);
    const entry = useChatStore.getState().marginaliaEntries.find((e) => e.id === id);
    expect(entry!.isStreaming).toBe(false);
  });

  it("removeMarginalia removes the entry by ID", () => {
    const id = useChatStore.getState().addMarginaliaEntry(100, "text");
    useChatStore.getState().removeMarginalia(id);
    expect(useChatStore.getState().marginaliaEntries.find((e) => e.id === id)).toBeUndefined();
  });

  it("source defaults to 'selection' when not specified", () => {
    const id = useChatStore.getState().addMarginaliaEntry(80, "text");
    const entry = useChatStore.getState().marginaliaEntries.find((e) => e.id === id);
    expect(entry!.source).toBe("selection");
  });

  it("source is 'highlight' when specified", () => {
    const id = useChatStore.getState().addMarginaliaEntry(80, "text", "highlight");
    const entry = useChatStore.getState().marginaliaEntries.find((e) => e.id === id);
    expect(entry!.source).toBe("highlight");
  });
});

describe("chat-store — triggerFromFailure", () => {
  beforeEach(resetStore);

  it("triggerFromFailure sets isOpen: true", () => {
    useChatStore.getState().triggerFromFailure();
    expect(useChatStore.getState().isOpen).toBe(true);
  });
});
