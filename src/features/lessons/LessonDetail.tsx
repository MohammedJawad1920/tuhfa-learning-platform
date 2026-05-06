"use client";

import { useQuery } from "@tanstack/react-query";
import * as endpoints from "@/api/endpoints";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { MarkCompleteButton } from "@/features/progress/MarkCompleteButton";
import { ProgressBadge } from "@/features/progress/ProgressBadge";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import type { Lesson } from "@/types/lesson";

interface LessonDetailProps {
  lessonId: number;
}

export function LessonDetail({ lessonId }: LessonDetailProps) {
  const query = useQuery<Lesson, Error>({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const resp = await endpoints.getLessonById(lessonId);
      return (resp as any).data?.lesson ?? null;
    },
    staleTime: 60_000,
  });

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // Loading state
  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Error state
  if (query.isError || !query.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-4">
        <div className="rounded-lg border border-error bg-surface-card p-8 text-center max-w-md">
          <p className="text-lg text-error mb-4">الدرس غير موجود</p>
          <p className="text-text-secondary mb-6 text-sm">
            ക്ലാസ്സ് കണ്ടെത്തിയില്ല
          </p>
          <Link href="/">
            <Button variant="primary" className="w-full">
              العودة إلى الدروس
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const lesson = query.data;

  return (
    <main className="min-h-screen bg-surface py-8 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-primary hover:text-primary-hover transition-colors mb-6"
        >
          <span>←</span>
          <span>العودة إلى الدروس</span>
        </Link>

        {/* Lesson header */}
        <div className="rounded-lg border border-border bg-surface-card p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1
                dir="rtl"
                lang="ar"
                className="text-3xl font-bold text-text-arabic mb-2"
              >
                {lesson.title_ar}
              </h1>
              <p className="text-sm text-text-secondary">
                الدرس {lesson.lesson_number} • المجلد {lesson.volume}
              </p>
            </div>
            <ProgressBadge lessonId={lessonId} />
          </div>

          {/* Chapter breadcrumb */}
          <div
            dir="rtl"
            lang="ar"
            className="flex flex-wrap gap-2 text-sm text-text-secondary mb-4"
          >
            {lesson.chapter?.kitab && (
              <>
                <span className="font-medium">{lesson.chapter.kitab}</span>
                {lesson.chapter?.bab && (
                  <>
                    <span>•</span>
                    <span>{lesson.chapter.bab}</span>
                  </>
                )}
                {lesson.chapter?.fasl && (
                  <>
                    <span>•</span>
                    <span>{lesson.chapter.fasl}</span>
                  </>
                )}
              </>
            )}
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-4 text-sm text-text-secondary mb-6 pb-6 border-b border-border">
            <div>
              <span className="text-text-secondary">المدة:</span>
              <span className="ml-2 font-medium">
                {formatDuration(lesson.duration_seconds)}
              </span>
            </div>
            <div>
              <span className="text-text-secondary">تاريخ التحميل:</span>
              <span className="ml-2 font-medium">
                {formatDate(lesson.upload_date)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <MarkCompleteButton lessonId={lessonId} />
          </div>
        </div>

        {/* Audio player */}
        <AudioPlayer
          src={lesson.archive_url}
          lessonId={lessonId}
          title={lesson.title_ar}
        />
      </div>
    </main>
  );
}
