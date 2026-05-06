"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { getLessonById } from "@/api/endpoints";
import { EditLessonForm } from "@/components/admin/EditLessonForm";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import type { Lesson } from "@/types/lesson";

export default function EditLessonPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const lessonId = Number(params?.id);

  const lessonQuery = useQuery<Lesson, Error>({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const response = await getLessonById(lessonId);
      return response.data.lesson;
    },
    enabled: Number.isInteger(lessonId) && lessonId > 0,
    staleTime: 60_000,
  });

  useEffect(() => {
    const status = (lessonQuery.error as { status?: number } | null)?.status;
    if (status === 401) {
      router.replace("/admin/login");
    }
  }, [lessonQuery.error, router]);

  if (!Number.isInteger(lessonId) || lessonId < 1) {
    return (
      <main className="min-h-screen bg-surface px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface-card p-6">
          <p className="text-sm text-error">معرف الدرس غير صالح</p>
          <Link href="/admin" className="mt-4 inline-block text-primary">
            العودة إلى الإدارة
          </Link>
        </div>
      </main>
    );
  }

  if (lessonQuery.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface">
        <Spinner />
      </main>
    );
  }

  if (lessonQuery.isError) {
    const status = (lessonQuery.error as { status?: number } | null)?.status;

    if (status === 404 || !lessonQuery.data) {
      return (
        <main className="min-h-screen bg-surface px-4 py-10">
          <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface-card p-6 text-center">
            <p className="text-lg font-semibold text-text-primary">
              الدرس لم يعد موجوداً
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              يمكن أن يكون قد حُذف أو تغير موقعه.
            </p>
            <Link href="/admin" className="mt-6 inline-block">
              <Button variant="secondary">العودة إلى الإدارة</Button>
            </Link>
          </div>
        </main>
      );
    }
  }

  if (!lessonQuery.data) {
    return null;
  }

  return (
    <main className="min-h-screen bg-surface px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link href="/admin" className="text-sm text-primary">
            العودة إلى الإدارة
          </Link>
          <h1 className="mt-2 text-display text-text-primary">تعديل الدرس</h1>
        </div>

        <EditLessonForm lesson={lessonQuery.data} />
      </div>
    </main>
  );
}
