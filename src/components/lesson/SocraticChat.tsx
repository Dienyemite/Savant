"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore, nextId } from "@/store/chat-store";
import { useLessonStore } from "@/store/lesson-store";
import { useGraphStore } from "@/store/graph-store";
import { DOMAIN_COLORS, DOMAIN_LABELS } from "@/types";
import type { LessonContext } from "@/lib/socratic-prompt";
import {
  MessageCircle,
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

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, lessonContext: ctx }),
      });

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
    } catch {
      useChatStore
        .getState()
        .updateLastAssistant(
          "I couldn't connect. Check your internet and try again!"
        );
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
      {/* Toggle button — always visible during lessons */}
      <AnimatePresence>
        {(!isOpen || isMinimized) && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={isMinimized ? openChat : toggleChat}
            className="fixed bottom-6 right-6 z-[60] flex items-center justify-center w-14 h-14 rounded-full shadow-lg shadow-black/40 transition-colors"
            style={{ backgroundColor: domainColor }}
          >
            <MessageCircle className="w-6 h-6 text-slate-950" />
            {/* Notification pulse on trigger */}
            {useChatStore.getState().hasBeenTriggered &&
              messages.length > 0 &&
              !isOpen && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 animate-pulse" />
              )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed bottom-6 right-6 z-[60] w-[380px] max-h-[500px] flex flex-col bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50"
              style={{
                background: `linear-gradient(135deg, ${domainColor}15, transparent)`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg"
                  style={{ backgroundColor: `${domainColor}20` }}
                >
                  <Sparkles
                    className="w-4 h-4"
                    style={{ color: domainColor }}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">
                    Socratic Tutor
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    I'll help you think, not give answers
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={minimizeChat}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={closeChat}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[340px] scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-8 space-y-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${domainColor}15` }}
                  >
                    <Sparkles
                      className="w-6 h-6"
                      style={{ color: domainColor }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300">
                      Need help thinking it through?
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Ask me a question — I&apos;ll guide you with hints, not
                      answers.
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-slate-700/70 text-slate-200 rounded-br-md"
                        : "bg-slate-800/70 text-slate-300 rounded-bl-md border border-slate-700/30"
                    }`}
                  >
                    {msg.content || (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Thinking…
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-1">
              <div className="flex items-center gap-2 bg-slate-800/70 rounded-xl px-3 py-2 border border-slate-700/30 focus-within:border-slate-600/50 transition-colors">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask for a hint…"
                  disabled={isStreaming}
                  className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                  className="flex items-center justify-center w-8 h-8 rounded-lg disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor:
                      input.trim() && !isStreaming
                        ? domainColor
                        : "transparent",
                  }}
                >
                  <Send
                    className="w-4 h-4"
                    style={{
                      color:
                        input.trim() && !isStreaming ? "#0f172a" : "#64748b",
                    }}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
