"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteLesson, listLessons } from "@/api/endpoints";
import { AdminLessonTable } from "@/components/admin/AdminLessonTable";
import { DeleteModal } from "@/components/admin/DeleteModal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Toast } from "@/components/ui/Toast";
import { mergeLessonPages } from "@/lib/lessons";
import type { Lesson } from "@/types/lesson";

type ToastState = {
  open: boolean;
  variant: "success" | "error" | "warning";
  message: string;
};

async function fetchAdminLessons(): Promise<Lesson[]> {
  const limit = 200;
  const offsets = [0, 200, 400, 600];
  const pages = await Promise.all(
    offsets.map((offset) => listLessons({ limit, offset })),
  );

  return mergeLessonPages(pages.map((page) => page?.data?.lessons ?? []));
}

export default function AdminLessonsPage() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const lessonsQuery = useQuery<Lesson[], Error>({
    queryKey: ["admin", "lessons", "all"],
    queryFn: fetchAdminLessons,
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (lessonId: number) => {
      await deleteLesson(lessonId);
      return lessonId;
    },
    onSuccess: async (lessonId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lessons", "all"] }),
        queryClient.invalidateQueries({
          queryKey: ["admin", "lessons", "all"],
        }),
        queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] }),
      ]);
      setDeleteTargetId(null);
      setToast({
        open: true,
        variant: "success",
        message: "تم الحذف بنجاح",
      });
    },
    onError: (error: unknown) => {
      const status = (error as { status?: number })?.status;

      if (status === 401) {
        window.location.replace("/admin/login");
        return;
      }

      if (status === 404) {
        setToast({
          open: true,
          variant: "warning",
          message: "الدرس غير موجود بالفعل",
        });
        void lessonsQuery.refetch();
        setDeleteTargetId(null);
        return;
      }

      if (status === 409) {
        setToast({
          open: true,
          variant: "error",
          message: "تعارض تزامن — أعد المحاولة",
        });
        setDeleteTargetId(null);
        return;
      }

      if (status === 429) {
        setToast({
          open: true,
          variant: "warning",
          message: "تم تجاوز الحد — حاول لاحقاً",
        });
        setDeleteTargetId(null);
        return;
      }

      setToast({
        open: true,
        variant: "error",
        message: "فشل حذف الدرس",
      });
      setDeleteTargetId(null);
    },
  });

  useEffect(() => {
    const status = (lessonsQuery.error as { status?: number } | null)?.status;
    if (status === 401) {
      window.location.replace("/admin/login");
    }
  }, [lessonsQuery.error]);

  const isDeleteOpen = deleteTargetId !== null;

  const handleEdit = (lessonId: number) => {
    window.location.assign(`/admin/lessons/${lessonId}/edit`);
  };

  const handleDeleteConfirm = () => {
    if (deleteTargetId === null) {
      return;
    }

    deleteMutation.mutate(deleteTargetId);
  };

  const handleDeleteCancel = () => {
    setDeleteTargetId(null);
  };

  if (lessonsQuery.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface">
        <Spinner />
      </main>
    );
  }

  if (lessonsQuery.isError) {
    return (
      <main className="min-h-screen bg-surface px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-surface-card p-6">
          <p className="text-sm text-error">تعذّر تحميل قائمة الدروس</p>
          <Button className="mt-4" onClick={() => lessonsQuery.refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      </main>
    );
  }

  const lessons = lessonsQuery.data ?? [];

  return (
    <main className="min-h-screen bg-surface px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-display text-text-primary">إدارة الدروس</h1>
            <p className="mt-2 text-sm text-text-secondary">
              عرض وحذف الدروس مع الحفاظ على ترتيبها في المصدر
            </p>
          </div>

          <Link
            href="/admin/lessons/new"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            درس جديد
          </Link>
        </div>

        {lessons.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface-card p-8 text-center">
            <p className="text-lg font-semibold text-text-primary">
              لا توجد دروس بعد
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              ابدأ بإضافة أول درس من صفحة الإنشاء.
            </p>
            <Link
              href="/admin/lessons/new"
              className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              إضافة درس
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface-card">
            <AdminLessonTable
              lessons={lessons}
              onEdit={handleEdit}
              onDelete={(lessonId) => setDeleteTargetId(lessonId)}
            />
          </div>
        )}
      </div>

      <DeleteModal
        lessonId={deleteTargetId}
        isOpen={isDeleteOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      <Toast
        open={toast?.open ?? false}
        variant={toast?.variant ?? "success"}
        onClose={() => setToast(null)}
      >
        {toast?.message ?? ""}
      </Toast>
    </main>
  );
}
