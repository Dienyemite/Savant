"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useGraphStore } from "@/store/graph-store";
import { useLessonStore } from "@/store/lesson-store";
import {
  DOMAIN_LABELS,
  type Lesson,
  type LessonBlock,
} from "@/types";
import { X, BookOpen, Lock, ArrowRight, Layers } from "lucide-react";

// ════════════════════════════════════════════════════════════
// LessonModal — Re-styled as a notebook annotation panel.
// Opens from the right side like a folded page or margin note.
// Strictly monochrome. No rounded cards — flat ruled sections.
// ════════════════════════════════════════════════════════════

// Block type labels
function blockTypeLabel(block: LessonBlock): string {
  switch (block.type) {
    case "text": return "reading";
    case "interactive_slider": return "slider";
    case "drag_drop_match": return "match";
    case "multiple_choice": return "quiz";
    case "formula_builder": return "formula";
    case "visual_feedback": return "diagram";
    default: return block.type;
  }
}

function LessonRow({
  lesson,
  index,
  conceptId,
  onLaunch,
}: {
  lesson: Lesson;
  index: number;
  conceptId: string;
  onLaunch: (lesson: Lesson, conceptId: string) => void;
}) {
  const interactiveBlocks = lesson.content_schema.filter(
    (b) => b.type !== "text"
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={() => onLaunch(lesson, conceptId)}
      className="group flex items-start gap-3 py-3 border-b border-white/[0.05] cursor-pointer hover:bg-white/[0.02] transition-colors px-1"
    >
      {/* Page index */}
      <span
        className="flex-shrink-0 text-[10px] text-white/20 w-5 pt-0.5"
        style={{ fontFamily: "'Courier New', monospace" }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/65 group-hover:text-white/85 transition-colors leading-snug">
          {lesson.title}
        </p>
        {lesson.description && (
          <p className="text-[11px] text-white/25 mt-0.5 leading-relaxed truncate">
            {lesson.description}
          </p>
        )}
        {interactiveBlocks.length > 0 && (
          <div
            className="flex flex-wrap gap-2 mt-1.5"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            {interactiveBlocks.map((b) => (
              <span
                key={b.id}
                className="flex items-center gap-1 text-[9px] tracking-widest uppercase text-white/20"
              >
                <Layers className="w-2.5 h-2.5" />
                {blockTypeLabel(b)}
              </span>
            ))}
          </div>
        )}
      </div>

      <ArrowRight className="w-3 h-3 text-white/10 group-hover:text-white/35 flex-shrink-0 mt-1 transition-colors" />
    </motion.div>
  );
}

export default function LessonModal() {
  const {
    selectedConceptId,
    isLessonModalOpen,
    closeLessonModal,
    getConceptNode,
    getConceptLessons,
    getPrerequisitesFor,
    getUnlockedBy,
  } = useGraphStore();

  const { startLesson } = useLessonStore();

  const handleLaunchLesson = (lesson: Lesson, conceptId: string) => {
    closeLessonModal();
    startLesson(lesson, conceptId);
  };

  if (!selectedConceptId) return null;

  const node = getConceptNode(selectedConceptId);
  if (!node) return null;

  const { concept, status } = node;
  const lessons = getConceptLessons(concept.id);
  const prereqs = getPrerequisitesFor(concept.id);
  const unlocks = getUnlockedBy(concept.id);

  return (
    <AnimatePresence>
      {isLessonModalOpen && (
        <>
          {/* Scrim */}
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLessonModal}
            className="fixed inset-0 z-30 bg-black/50"
          />

          {/* Panel — slides in from right like turning a page */}
          <motion.aside
            key="panel"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed top-0 right-0 bottom-0 z-40 w-full max-w-sm bg-black border-l border-white/[0.08] notebook-ruled overflow-y-auto"
          >
            {/* Panel header */}
            <div className="sticky top-0 bg-black/95 border-b border-white/[0.06] px-6 py-4 flex items-start justify-between z-10">
              <div>
                <p
                  className="text-[9px] tracking-[0.25em] uppercase text-white/20 mb-1"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  {DOMAIN_LABELS[concept.domain]} — {status}
                </p>
                <h2 className="text-base font-semibold text-white/80 leading-snug">
                  {concept.title}
                </h2>
              </div>
              <button
                onClick={closeLessonModal}
                className="text-white/20 hover:text-white/55 transition-colors ml-4 mt-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-7">
              {/* Description */}
              <p className="text-sm text-white/40 leading-relaxed">
                {concept.description}
              </p>

              {/* Difficulty */}
              <div
                className="flex items-center gap-3"
                style={{ fontFamily: "'Courier New', monospace" }}
              >
                <span className="text-[9px] tracking-widest uppercase text-white/20">
                  Difficulty
                </span>
                <div className="flex gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-4 h-px"
                      style={{
                        background:
                          i < concept.difficulty
                            ? "rgba(255,255,255,0.55)"
                            : "rgba(255,255,255,0.08)",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Prerequisites */}
              {prereqs.length > 0 && (
                <div className="space-y-2">
                  <p
                    className="text-[9px] tracking-[0.2em] uppercase text-white/20"
                    style={{ fontFamily: "'Courier New', monospace" }}
                  >
                    Requires
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {prereqs.map((p) => (
                      <span
                        key={p.id}
                        className="text-[10px] text-white/35 border border-white/[0.08] px-2 py-0.5"
                        style={{ fontFamily: "'Courier New', monospace" }}
                      >
                        {p.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Locked state */}
              {status === "locked" && (
                <div className="py-6 text-center space-y-2">
                  <Lock className="w-6 h-6 mx-auto text-white/15" />
                  <p
                    className="text-[11px] text-white/25 tracking-wide"
                    style={{ fontFamily: "'Courier New', monospace" }}
                  >
                    Complete prerequisites to unlock.
                  </p>
                </div>
              )}

              {/* Lessons list */}
              {status !== "locked" && lessons.length > 0 && (
                <div className="space-y-1">
                  <p
                    className="text-[9px] tracking-[0.2em] uppercase text-white/20 border-b border-white/[0.05] pb-2 mb-0"
                    style={{ fontFamily: "'Courier New', monospace" }}
                  >
                    Lessons — {lessons.length}
                  </p>
                  <div>
                    {lessons.map((lesson, i) => (
                      <LessonRow
                        key={lesson.id}
                        lesson={lesson}
                        index={i}
                        conceptId={concept.id}
                        onLaunch={handleLaunchLesson}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Start CTA */}
              {status === "unlocked" && lessons.length > 0 && (
                <button
                  onClick={() => handleLaunchLesson(lessons[0], concept.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-white/15 text-white/60 hover:text-white hover:border-white/35 transition-colors text-[11px] tracking-[0.18em] uppercase"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Begin Lesson
                </button>
              )}

              {/* Mastered — re-study */}
              {status === "mastered" && lessons.length > 0 && (
                <button
                  onClick={() => handleLaunchLesson(lessons[0], concept.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-white/[0.07] text-white/25 hover:text-white/50 hover:border-white/15 transition-colors text-[11px] tracking-[0.18em] uppercase"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  Review Lesson
                </button>
              )}

              {/* Unlocks */}
              {unlocks.length > 0 && (
                <div className="space-y-2 border-t border-white/[0.05] pt-5">
                  <p
                    className="text-[9px] tracking-[0.2em] uppercase text-white/18"
                    style={{ fontFamily: "'Courier New', monospace" }}
                  >
                    Unlocks
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {unlocks.map((u) => (
                      <span
                        key={u.id}
                        className="text-[10px] text-white/20 border border-dashed border-white/[0.08] px-2 py-0.5"
                        style={{ fontFamily: "'Courier New', monospace" }}
                      >
                        {u.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

import {
  BookOpen,
  Lock,
  CheckCircle2,
  ArrowRight,
  Clock,
  Layers,
} from "lucide-react";

// Render a preview of lesson content blocks
function LessonBlockPreview({ block }: { block: LessonBlock }) {
  switch (block.type) {
    case "text":
      return (
        <div className="flex items-center gap-2 text-xs text-white/40">
          <BookOpen className="w-3 h-3" />
          <span>Reading</span>
        </div>
      );
    case "interactive_slider":
      return (
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Layers className="w-3 h-3" />
          <span>Interactive Slider</span>
        </div>
      );
    case "drag_drop_match":
      return (
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Layers className="w-3 h-3" />
          <span>Drag & Drop</span>
        </div>
      );
    case "multiple_choice":
      return (
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Layers className="w-3 h-3" />
          <span>Multiple Choice</span>
        </div>
      );
    case "formula_builder":
      return (
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Layers className="w-3 h-3" />
          <span>Formula Builder</span>
        </div>
      );
    case "visual_feedback":
      return (
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Layers className="w-3 h-3" />
          <span>Visual Feedback</span>
        </div>
      );
    default:
      return null;
  }
}

function LessonCard({
  lesson,
  index,
  color,
  conceptId,
  onLaunch,
}: {
  lesson: Lesson;
  index: number;
  color: string;
  conceptId: string;
  onLaunch: (lesson: Lesson, conceptId: string) => void;
}) {
  const interactiveBlocks = lesson.content_schema.filter(
    (b) => b.type !== "text"
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={() => onLaunch(lesson, conceptId)}
      className="group rounded-xl border border-white/8 bg-black p-4
                 hover:border-white/20 hover:bg-white/3 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold bg-white/8 text-white/60"
            >
              {index + 1}
            </span>
            <h4 className="text-sm font-semibold text-white/80">
              {lesson.title}
            </h4>
          </div>
          {lesson.description && (
            <p className="text-xs text-white/40 leading-relaxed pl-8">
              {lesson.description}
            </p>
          )}
          {/* Interactive block indicators */}
          <div className="flex flex-wrap gap-3 pl-8 pt-1">
            {interactiveBlocks.map((block) => (
              <LessonBlockPreview key={block.id} block={block} />
            ))}
          </div>
        </div>
        <ArrowRight
          className="w-4 h-4 text-white/20 group-hover:text-white/50
                     transition-colors mt-1 flex-shrink-0"
        />
      </div>
    </motion.div>
  );
}

export default function LessonModal() {
  const {
    selectedConceptId,
    isLessonModalOpen,
    closeLessonModal,
    getConceptNode,
    getConceptLessons,
    getPrerequisitesFor,
    getUnlockedBy,
  } = useGraphStore();

  const { startLesson } = useLessonStore();

  const handleLaunchLesson = (lesson: Lesson, conceptId: string) => {
    closeLessonModal();
    startLesson(lesson, conceptId);
  };

  if (!selectedConceptId) return null;

  const node = getConceptNode(selectedConceptId);
  if (!node) return null;

  const { concept, status } = node;
  const lessons = getConceptLessons(concept.id);
  const prereqs = getPrerequisitesFor(concept.id);
  const unlocks = getUnlockedBy(concept.id);
  const color = DOMAIN_COLORS[concept.domain];

  return (
    <AnimatePresence>
      <Dialog open={isLessonModalOpen} onOpenChange={closeLessonModal}>
        <DialogContent className="sm:max-w-[560px] bg-black border-white/15 text-white p-0 overflow-hidden glow-border">
          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <Badge
                  variant="outline"
                  className="text-xs border-white/20 text-white/50"
                >
                  {DOMAIN_LABELS[concept.domain]}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    status === "mastered"
                      ? "border-white/40 text-white"
                      : status === "unlocked"
                      ? "border-white/25 text-white/60"
                      : "border-white/10 text-white/25"
                  }`}
                >
                  {status === "mastered" && (
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                  )}
                  {status === "locked" && <Lock className="w-3 h-3 mr-1" />}
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold text-white text-glow-subtle">
                {concept.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-white/40 leading-relaxed">
                {concept.description}
              </DialogDescription>
            </DialogHeader>

            {/* Difficulty */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-white/30">Difficulty</span>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < concept.difficulty ? "bg-white" : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <Separator className="bg-white/8" />

          <ScrollArea className="max-h-[400px]">
            <div className="px-6 py-4 space-y-6">
              {/* Prerequisites */}
              {prereqs.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest">
                    Prerequisites
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {prereqs.map((p) => (
                      <span
                        key={p.id}
                        className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-white/45 border border-white/8"
                      >
                        {p.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Lessons */}
              {status !== "locked" && lessons.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest">
                      Lessons
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-white/25">
                      <Clock className="w-3 h-3" />
                      {lessons.length}{" "}
                      {lessons.length === 1 ? "lesson" : "lessons"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {lessons.map((lesson, i) => (
                      <LessonCard
                        key={lesson.id}
                        lesson={lesson}
                        index={i}
                        color={color}
                        conceptId={concept.id}
                        onLaunch={handleLaunchLesson}
                      />
                    ))}
                  </div>
                </div>
              )}

              {status === "locked" && (
                <div className="text-center py-6 space-y-3">
                  <Lock className="w-8 h-8 mx-auto text-white/25" />
                  <p className="text-sm text-white/35">
                    Complete all prerequisites to unlock this concept.
                  </p>
                </div>
              )}

              {/* Unlocks */}
              {unlocks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest">
                    Unlocks
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {unlocks.map((u) => (
                      <span
                        key={u.id}
                        className="text-xs px-2.5 py-1 rounded-lg border border-dashed border-white/15 text-white/30"
                      >
                        {u.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          {status === "unlocked" && lessons.length > 0 && (
            <>
              <Separator className="bg-white/8" />
              <div className="px-6 py-4">
                <Button
                  onClick={() => {
                    if (lessons.length > 0) {
                      handleLaunchLesson(lessons[0], concept.id);
                    }
                  }}
                  className="w-full font-semibold bg-white text-black hover:bg-white/90"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Start Learning
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
}
