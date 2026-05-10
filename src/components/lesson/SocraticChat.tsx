"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore, nextId } from "@/store/chat-store";
import { useLessonStore } from "@/store/lesson-store";
import { useGraphStore } from "@/store/graph-store";
import { DOMAIN_COLORS, DOMAIN_LABELS } from "@/types";
import type { LessonContext } from "@/lib/socratic-prompt";
import {
  X,
  Minus,
  Send,
  Sparkles,
  Loader2,
} from "lucide-react";

// ============================================
// SocraticChat — Floating chat overlay
// Appears during lessons. Auto-triggered after
// 2 failed attempts on an interactive block.
// Uses streaming via the Vercel AI SDK.
// ============================================

function buildLessonContext(): LessonContext | null {
  const lessonState = useLessonStore.getState();
  const graphState = useGraphStore.getState();

  const { activeLesson, activeLessonConceptId, currentSlideIndex, totalSlides, getProgress, getCurrentBlock, getBlockAnswer } = lessonState;
  if (!activeLesson || !activeLessonConceptId) return null;

  const concept = graphState.concepts.find(
    (c) => c.id === activeLessonConceptId
  );
  if (!concept) return null;

  const block = getCurrentBlock();
  if (!block) return null;

  const answer = getBlockAnswer(block.id);

  // Strip the block into a clean object (remove id, order for LLM context)
  const { id: _id, order: _order, ...blockContent } = block;

  return {
    lessonTitle: activeLesson.title,
    lessonDescription: activeLesson.description ?? "",
    conceptTitle: concept.title,
    conceptDomain: DOMAIN_LABELS[concept.domain],
    currentBlockType: block.type,
    currentBlockContent: blockContent as Record<string, unknown>,
    studentAnswer: answer.value,
    attemptCount: answer.attempts,
    slideIndex: currentSlideIndex,
    totalSlides,
    lessonProgress: getProgress(),
  };
}

export default function SocraticChat() {
  const {
    isOpen,
    isMinimized,
    messages,
    isStreaming,
    openChat,
    closeChat,
    toggleChat,
    minimizeChat,
    addMessage,
    setStreaming,
  } = useChatStore();

  const { activeLessonConceptId, isLessonActive } = useLessonStore();
  const { concepts } = useGraphStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const concept = concepts.find((c) => c.id === activeLessonConceptId);
  const domainColor = concept ? DOMAIN_COLORS[concept.domain] : "#06b6d4";

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, isMinimized]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg = { id: nextId(), role: "user" as const, content: trimmed };
    addMessage(userMsg);
    setInput("");

    const ctx = buildLessonContext();
    if (!ctx) return;

    // Prepare message history for the API (strip IDs)
    const apiMessages = [...useChatStore.getState().messages].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Create placeholder assistant message for streaming
    const assistantId = nextId();
    addMessage({ id: assistantId, role: "assistant", content: "" });
    setStreaming(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, lessonContext: ctx }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 429) {
        useChatStore.getState().updateLastAssistant(
          "I need a moment to think. Try again in a minute."
        );
        setStreaming(false);
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMessage =
          (errData as Record<string, string>).error ??
          "I'm having trouble connecting right now. Try again in a moment!";
        useChatStore.getState().updateLastAssistant(errMessage);
        setStreaming(false);
        return;
      }

      // Stream the response
      const reader = res.body?.getReader();
      if (!reader) {
        useChatStore
          .getState()
          .updateLastAssistant("Something went wrong. Try again!");
        setStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        useChatStore.getState().updateLastAssistant(accumulated);
      }

      // Ensure final content is set
      if (accumulated) {
        useChatStore.getState().updateLastAssistant(accumulated);
      }
    } catch (err) {
      clearTimeout(timeout);
      const msg =
        err instanceof DOMException && err.name === "AbortError"
          ? "Savant is thinking slowly — try again."
          : "I couldn't connect. Check your internet and try again!";
      useChatStore.getState().updateLastAssistant(msg);
    } finally {
      setStreaming(false);
    }
  }, [input, isStreaming, addMessage, setStreaming]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleSend();
      }
    },
    [handleSend]
  );

  if (!isLessonActive) return null;

  return (
    <>
      {/* ── Toggle button — pencil icon in margin ── */}
      <AnimatePresence>
        {(!isOpen || isMinimized) && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isMinimized ? openChat : toggleChat}
            className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 border border-white/[0.08] bg-black/90 px-3 py-2 hover:border-white/20 transition-colors"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            <Sparkles className="w-3.5 h-3.5 text-white/35" />
            <span className="text-[10px] tracking-widest uppercase text-white/30">
              Tutor
            </span>
            {useChatStore.getState().hasBeenTriggered &&
              messages.length > 0 &&
              !isOpen && (
                <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
              )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat panel — notebook sidebar style ── */}
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-0 right-0 top-0 z-[60] w-80 flex flex-col bg-black border-l border-white/[0.07] notebook-ruled overflow-hidden"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]"
              style={{ fontFamily: "'Courier New', monospace" }}
            >
              <div>
                <p className="text-[9px] tracking-[0.22em] uppercase text-white/20 mb-0.5">
                  Socratic Tutor
                </p>
                <p className="text-[10px] text-white/30">
                  Hints only — no answers
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={minimizeChat}
                  className="p-1.5 text-white/20 hover:text-white/50 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={closeChat}
                  className="p-1.5 text-white/20 hover:text-white/50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-10 space-y-2">
                  <p className="text-[11px] text-white/30 leading-relaxed">
                    Ask me a question about the lesson. I&apos;ll help you
                    think — not give you the answer.
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "text-white/65 pl-4 border-l border-white/15"
                      : "text-white/40 italic"
                  }`}
                >
                  {msg.content || (
                    <span className="inline-flex items-center gap-1 text-white/20">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span style={{ fontFamily: "'Courier New', monospace" }}>
                        thinking…
                      </span>
                    </span>
                  )}
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-5 pb-5 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 border-b border-white/10 py-2 focus-within:border-white/25 transition-colors">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask for a hint…"
                  disabled={isStreaming}
                  className="flex-1 bg-transparent text-[12px] text-white/65 placeholder-white/18 outline-none disabled:opacity-40"
                  style={{ fontFamily: "'ivy-presto', serif" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                  className="text-white/20 hover:text-white/55 disabled:opacity-20 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
