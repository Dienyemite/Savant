import { create } from "zustand";

// ============================================
// Chat Store — Manages Socratic Tutor state
// Tracks messages, open/closed state, and
// auto-trigger logic (appears after 2 failures).
//
// Phase 5 addition: marginalia entries — AI
// responses that appear as positioned annotations
// next to selected lesson content.
// ============================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/**
 * A marginalia entry: an AI response rendered as a
 * positioned note in the right margin of the lesson page,
 * anchored to the Y-coordinate of the selected text.
 */
export interface MarginaliaEntry {
  id: string;
  /** Y position (page-relative px) of the text selection anchor */
  anchorY: number;
  /** The highlighted text that was selected when invoking the tutor */
  selectedText: string;
  /** Streamed AI response content */
  content: string;
  isStreaming: boolean;
  /** "selection" = user selected text; "highlight" = user drew a highlight stroke */
  source: "selection" | "highlight";
}

interface ChatState {
  // UI state
  isOpen: boolean;
  isMinimized: boolean;
  hasBeenTriggered: boolean; // pulse animation on first trigger

  // Messages
  messages: ChatMessage[];
  isStreaming: boolean;

  // Phase 5: Marginalia entries
  marginaliaEntries: MarginaliaEntry[];

  // Actions
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  minimizeChat: () => void;
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistant: (content: string) => void;
  setStreaming: (v: boolean) => void;
  triggerFromFailure: () => void;
  resetChat: () => void;

  // Phase 5: Marginalia actions
  addMarginaliaEntry: (anchorY: number, selectedText: string, source?: "selection" | "highlight") => string;
  updateMarginalia: (id: string, content: string) => void;
  finishMarginalia: (id: string) => void;
  removeMarginalia: (id: string) => void;
}

let messageCounter = 0;
function nextId(): string {
  return `msg-${++messageCounter}-${Date.now()}`;
}

export const useChatStore = create<ChatState>((set, get) => ({
  isOpen: false,
  isMinimized: false,
  hasBeenTriggered: false,
  messages: [],
  isStreaming: false,
  marginaliaEntries: [],

  openChat: () => set({ isOpen: true, isMinimized: false }),
  closeChat: () => set({ isOpen: false }),
  toggleChat: () => {
    const { isOpen } = get();
    set({ isOpen: !isOpen, isMinimized: false });
  },
  minimizeChat: () => set({ isMinimized: true }),

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),

  updateLastAssistant: (content: string) =>
    set((s) => {
      const msgs = [...s.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "assistant") {
          msgs[i] = { ...msgs[i], content };
          break;
        }
      }
      return { messages: msgs };
    }),

  setStreaming: (v) => set({ isStreaming: v }),

  triggerFromFailure: () => {
    const { isOpen, hasBeenTriggered, messages } = get();
    if (!isOpen && messages.length === 0) {
      set({
        isOpen: true,
        hasBeenTriggered: true,
        messages: [
          {
            id: nextId(),
            role: "assistant",
            content:
              "Hey there! I noticed you might be stuck. Let's think through this together — what part feels tricky to you?",
          },
        ],
      });
    } else if (!isOpen) {
      set({ isOpen: true, hasBeenTriggered: true });
    }
  },

  resetChat: () =>
    set({
      isOpen: false,
      isMinimized: false,
      hasBeenTriggered: false,
      messages: [],
      isStreaming: false,
    }),

  // ── Phase 5: Marginalia ──

  addMarginaliaEntry: (anchorY, selectedText, source = "selection") => {
    const id = nextId();
    set((s) => ({
      marginaliaEntries: [
        ...s.marginaliaEntries,
        { id, anchorY, selectedText, content: "", isStreaming: true, source },
      ],
    }));
    return id;
  },

  updateMarginalia: (id, content) =>
    set((s) => ({
      marginaliaEntries: s.marginaliaEntries.map((e) =>
        e.id === id ? { ...e, content } : e
      ),
    })),

  finishMarginalia: (id) =>
    set((s) => ({
      marginaliaEntries: s.marginaliaEntries.map((e) =>
        e.id === id ? { ...e, isStreaming: false } : e
      ),
    })),

  removeMarginalia: (id) =>
    set((s) => ({
      marginaliaEntries: s.marginaliaEntries.filter((e) => e.id !== id),
    })),
}));

export { nextId };
