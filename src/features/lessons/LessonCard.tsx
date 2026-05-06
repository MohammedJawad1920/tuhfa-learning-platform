"use client";

import { forwardRef } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { Lesson } from "@/types/lesson";

interface LessonCardProps {
  lesson: Lesson;
  isCompleted?: boolean;
}

export const LessonCard = forwardRef<HTMLLIElement, LessonCardProps>(
  ({ lesson, isCompleted = false }, ref) => {
    const formatDuration = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
      }
      return `${minutes}:${secs.toString().padStart(2, "0")}`;
    };

    return (
      <li ref={ref} className="border-b border-border last:border-b-0">
        <Link
          href={`/lessons/${lesson.id}`}
          className="group flex items-start gap-4 px-4 py-3 transition-colors hover:bg-surface-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p
                  dir="rtl"
                  lang="ar"
                  className="font-semibold text-text-arabic line-clamp-2 group-hover:text-primary transition-colors"
                >
                  {lesson.title_ar}
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  الدرس {lesson.lesson_number}
                </p>
              </div>
              {isCompleted && <Badge variant="completed">مُنجَز</Badge>}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
              {lesson.chapter?.kitab && (
                <span dir="rtl" lang="ar">
                  {lesson.chapter.kitab}
                </span>
              )}
              {lesson.chapter?.bab && (
                <>
                  <span>•</span>
                  <span dir="rtl" lang="ar">
                    {lesson.chapter.bab}
                  </span>
                </>
              )}
              <span className="mr-auto">
                {formatDuration(lesson.duration_seconds)}
              </span>
            </div>
          </div>
        </Link>
      </li>
    );
  },
);

LessonCard.displayName = "LessonCard";
