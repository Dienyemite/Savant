"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGraphStore } from "@/store/graph-store";
import { useLessonStore } from "@/store/lesson-store";
import {
  DOMAIN_COLORS,
  DOMAIN_LABELS,
  type Lesson,
  type LessonBlock,
} from "@/types";
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
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <BookOpen className="w-3 h-3" />
          <span>Reading</span>
        </div>
      );
    case "interactive_slider":
      return (
        <div className="flex items-center gap-2 text-xs text-cyan-400">
          <Layers className="w-3 h-3" />
          <span>Interactive Slider</span>
        </div>
      );
    case "drag_drop_match":
      return (
        <div className="flex items-center gap-2 text-xs text-amber-400">
          <Layers className="w-3 h-3" />
          <span>Drag & Drop</span>
        </div>
      );
    case "multiple_choice":
      return (
        <div className="flex items-center gap-2 text-xs text-violet-400">
          <Layers className="w-3 h-3" />
          <span>Multiple Choice</span>
        </div>
      );
    case "formula_builder":
      return (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <Layers className="w-3 h-3" />
          <span>Formula Builder</span>
        </div>
      );
    case "visual_feedback":
      return (
        <div className="flex items-center gap-2 text-xs text-pink-400">
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
      className="group rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 
                 hover:border-slate-600 hover:bg-slate-800/80 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {index + 1}
            </span>
            <h4 className="text-sm font-semibold text-slate-200">
              {lesson.title}
            </h4>
          </div>
          {lesson.description && (
            <p className="text-xs text-slate-400 leading-relaxed pl-8">
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
          className="w-4 h-4 text-slate-600 group-hover:text-slate-400 
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
        <DialogContent className="sm:max-w-[560px] bg-slate-900 border-slate-700/70 text-slate-100 p-0 overflow-hidden">
          {/* Header with gradient accent */}
          <div
            className="px-6 pt-6 pb-4"
            style={{
              background: `linear-gradient(135deg, ${color}10 0%, transparent 60%)`,
            }}
          >
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <Badge
                  variant="outline"
                  className="text-xs border-slate-600"
                  style={{ color, borderColor: `${color}40` }}
                >
                  {DOMAIN_LABELS[concept.domain]}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    status === "mastered"
                      ? "border-emerald-500/40 text-emerald-400"
                      : status === "unlocked"
                      ? "border-amber-500/40 text-amber-400"
                      : "border-slate-600 text-slate-500"
                  }`}
                >
                  {status === "mastered" && (
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                  )}
                  {status === "locked" && <Lock className="w-3 h-3 mr-1" />}
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold text-slate-100">
                {concept.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-400 leading-relaxed">
                {concept.description}
              </DialogDescription>
            </DialogHeader>

            {/* Difficulty */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-slate-500">Difficulty</span>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        i < concept.difficulty ? color : "#334155",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <Separator className="bg-slate-700/50" />

          <ScrollArea className="max-h-[400px]">
            <div className="px-6 py-4 space-y-6">
              {/* Prerequisites */}
              {prereqs.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Prerequisites
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {prereqs.map((p) => (
                      <span
                        key={p.id}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700/50"
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
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Lessons
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-slate-600">
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
                  <Lock className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-sm text-slate-500">
                    Complete all prerequisites to unlock this concept.
                  </p>
                </div>
              )}

              {/* Unlocks */}
              {unlocks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Unlocks
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {unlocks.map((u) => (
                      <span
                        key={u.id}
                        className="text-xs px-2.5 py-1 rounded-lg border border-dashed border-slate-700 text-slate-500"
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
              <Separator className="bg-slate-700/50" />
              <div className="px-6 py-4">
                <Button
                  onClick={() => {
                    if (lessons.length > 0) {
                      handleLaunchLesson(lessons[0], concept.id);
                    }
                  }}
                  className="w-full font-semibold"
                  style={{
                    backgroundColor: color,
                    color: "#0f172a",
                  }}
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
