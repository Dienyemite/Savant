import { create } from "zustand";

// ============================================
// Chat Store — Manages Socratic Tutor state
// Tracks messages, open/closed state, and
// auto-trigger logic (appears after 2 failures).
// ============================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatState {
  // UI state
  isOpen: boolean;
  isMinimized: boolean;
  hasBeenTriggered: boolean; // pulse animation on first trigger

  // Messages
  messages: ChatMessage[];
  isStreaming: boolean;

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
      // First time trigger — add a greeting
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
}));

export { nextId };
