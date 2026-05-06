"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { updateLesson } from "@/api/endpoints";
import { Button } from "@/components/ui/Button";
import { FieldError, Label } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";
import type { Lesson } from "@/types/lesson";

type EditLessonFormValues = {
  title_ar: string;
  chapter_kitab: string;
  chapter_bab: string;
  chapter_fasl: string;
  duration_seconds: string;
  upload_date: string;
  archive_url: string;
  telegram_post_id: string;
};

type InlineErrorState = Record<string, string>;

type ToastState = {
  open: boolean;
  variant: "success" | "error" | "warning";
  message: string;
};

function normalizeText(value: string | undefined | null): string {
  return value?.trim() ?? "";
}

export function EditLessonForm({ lesson }: { lesson: Lesson }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [inlineErrors, setInlineErrors] = useState<InlineErrorState>({});
  const [toast, setToast] = useState<ToastState | null>(null);

  const defaultValues = useMemo<EditLessonFormValues>(
    () => ({
      title_ar: lesson.title_ar,
      chapter_kitab: lesson.chapter.kitab,
      chapter_bab: lesson.chapter.bab ?? "",
      chapter_fasl: lesson.chapter.fasl ?? "",
      duration_seconds: String(lesson.duration_seconds),
      upload_date: lesson.upload_date,
      archive_url: lesson.archive_url,
      telegram_post_id: String(lesson.telegram_post_id),
    }),
    [lesson],
  );

  const form = useForm<EditLessonFormValues>({
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    setInlineErrors({});
    setToast(null);

    const dirtyFields = form.formState.dirtyFields;
    const patch: Record<string, unknown> = {};

    if (dirtyFields.title_ar) patch.title_ar = values.title_ar.trim();
    if (dirtyFields.archive_url) patch.archive_url = values.archive_url.trim();
    if (dirtyFields.duration_seconds) {
      patch.duration_seconds = Number(values.duration_seconds);
    }
    if (dirtyFields.upload_date) patch.upload_date = values.upload_date;
    if (dirtyFields.telegram_post_id) {
      patch.telegram_post_id = Number(values.telegram_post_id);
    }
    if (
      dirtyFields.chapter_kitab ||
      dirtyFields.chapter_bab ||
      dirtyFields.chapter_fasl
    ) {
      patch.chapter = {
        kitab: normalizeText(values.chapter_kitab),
        bab: normalizeText(values.chapter_bab) || null,
        fasl: normalizeText(values.chapter_fasl) || null,
      };
    }

    try {
      await updateLesson(lesson.id, patch);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lesson", lesson.id] }),
        queryClient.invalidateQueries({ queryKey: ["lessons", "all"] }),
        queryClient.invalidateQueries({
          queryKey: ["admin", "lessons", "all"],
        }),
        queryClient.invalidateQueries({ queryKey: ["lessons", "filtered"] }),
      ]);

      setToast({
        open: true,
        variant: "success",
        message: "تم الحفظ",
      });
      router.replace("/admin");
    } catch (error) {
      const status = (error as { status?: number })?.status;
      const body = (error as { body?: any })?.body;

      if (status === 401) {
        router.replace("/admin/login");
        return;
      }

      if (status === 404) {
        setInlineErrors({ form: "الدرس لم يعد موجوداً" });
        return;
      }

      if (status === 409) {
        setToast({
          open: true,
          variant: "error",
          message: "تعارض — أعد المحاولة",
        });
        return;
      }

      if (status === 422) {
        const details = body?.error?.details ?? {};
        const nextErrors = Object.fromEntries(
          Object.entries(details).map(([key, value]) => [key, String(value)]),
        );
        setInlineErrors(nextErrors);
        return;
      }

      setInlineErrors({ form: "فشل حفظ التغييرات — حاول لاحقاً" });
    }
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {inlineErrors.form ? <FieldError>{inlineErrors.form}</FieldError> : null}

      <section className="rounded-2xl border border-border bg-surface-card p-5">
        <h2 className="text-subheading text-text-primary">البيانات الثابتة</h2>
        <dl className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-secondary">
              المعرّف
            </dt>
            <dd aria-readonly="true" className="mt-1 text-sm text-text-primary">
              {lesson.id}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-secondary">
              المجلد
            </dt>
            <dd aria-readonly="true" className="mt-1 text-sm text-text-primary">
              {lesson.volume}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-secondary">
              رقم الدرس
            </dt>
            <dd aria-readonly="true" className="mt-1 text-sm text-text-primary">
              {lesson.lesson_number}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-surface-card p-5">
        <div>
          <Label htmlFor="title_ar">العنوان العربي</Label>
          <Textarea
            id="title_ar"
            rows={3}
            {...form.register("title_ar", {
              required: "العنوان العربي مطلوب",
            })}
          />
          {inlineErrors.title_ar ? (
            <FieldError>{inlineErrors.title_ar}</FieldError>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="chapter_kitab">الكتاب</Label>
            <Input
              id="chapter_kitab"
              {...form.register("chapter_kitab", {
                required: "الكتاب مطلوب",
              })}
            />
            {inlineErrors.chapter_kitab ? (
              <FieldError>{inlineErrors.chapter_kitab}</FieldError>
            ) : null}
          </div>

          <div>
            <Label htmlFor="chapter_bab">الباب</Label>
            <Input id="chapter_bab" {...form.register("chapter_bab")} />
          </div>

          <div>
            <Label htmlFor="chapter_fasl">الفصل</Label>
            <Input id="chapter_fasl" {...form.register("chapter_fasl")} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="duration_seconds">المدة بالثواني</Label>
            <Input
              id="duration_seconds"
              type="number"
              {...form.register("duration_seconds", {
                required: "المدة مطلوبة",
              })}
            />
            {inlineErrors.duration_seconds ? (
              <FieldError>{inlineErrors.duration_seconds}</FieldError>
            ) : null}
          </div>

          <div>
            <Label htmlFor="upload_date">تاريخ الرفع</Label>
            <Input
              id="upload_date"
              type="date"
              {...form.register("upload_date", {
                required: "تاريخ الرفع مطلوب",
              })}
            />
            {inlineErrors.upload_date ? (
              <FieldError>{inlineErrors.upload_date}</FieldError>
            ) : null}
          </div>

          <div>
            <Label htmlFor="telegram_post_id">معرف منشور Telegram</Label>
            <Input
              id="telegram_post_id"
              type="number"
              {...form.register("telegram_post_id", {
                required: "معرف المنشور مطلوب",
              })}
            />
            {inlineErrors.telegram_post_id ? (
              <FieldError>{inlineErrors.telegram_post_id}</FieldError>
            ) : null}
          </div>
        </div>

        <div>
          <Label htmlFor="archive_url">archive_url</Label>
          <Input
            id="archive_url"
            {...form.register("archive_url", {
              required: "archive_url مطلوب",
              pattern: {
                value: /^https:\/\/archive\.org\/download\//,
                message:
                  "archive_url must start with https://archive.org/download/",
              },
            })}
          />
          {inlineErrors.archive_url ? (
            <FieldError>{inlineErrors.archive_url}</FieldError>
          ) : null}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          loading={form.formState.isSubmitting}
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "جارٍ الحفظ" : "حفظ"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.replace("/admin")}
        >
          إلغاء
        </Button>
      </div>

      <Toast
        open={toast?.open ?? false}
        variant={toast?.variant ?? "success"}
        onClose={() => setToast(null)}
      >
        {toast?.message ?? ""}
      </Toast>
    </form>
  );
}

export default EditLessonForm;
