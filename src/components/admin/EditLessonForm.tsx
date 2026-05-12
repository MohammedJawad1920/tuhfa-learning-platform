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

type RequestErrorBody = {
  error?: {
    details?: Record<string, unknown>;
  };
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
        message: "Saved.",
      });
      router.replace("/admin");
    } catch (error) {
      const status = (error as { status?: number })?.status;
      const body = (error as { body?: RequestErrorBody })?.body;

      if (status === 401) {
        router.replace("/admin/login");
        return;
      }

      if (status === 404) {
        setInlineErrors({ form: "Lesson no longer exists." });
        return;
      }

      if (status === 409) {
        setToast({
          open: true,
          variant: "error",
          message: "Concurrent edit conflict — please retry.",
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

      setInlineErrors({ form: "Failed to save changes. Please try again." });
    }
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {inlineErrors.form ? <FieldError>{inlineErrors.form}</FieldError> : null}

      <section className="rounded-2xl border border-border bg-surface-card p-5">
        <h2 className="text-subheading text-text-primary">Immutable Fields</h2>
        <dl className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-secondary">
              ID
            </dt>
            <dd aria-readonly="true" className="mt-1 text-sm text-text-primary">
              {lesson.id}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-secondary">
              Volume
            </dt>
            <dd aria-readonly="true" className="mt-1 text-sm text-text-primary">
              {lesson.volume}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-secondary">
              Lesson #
            </dt>
            <dd aria-readonly="true" className="mt-1 text-sm text-text-primary">
              {lesson.lesson_number}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-surface-card p-5">
        <div>
          <Label htmlFor="title_ar">Title (Arabic)</Label>
          <Textarea
            id="title_ar"
            rows={3}
            dir="rtl"
            lang="ar"
            placeholder="اكتب عنوان الدرس بالعربية"
            {...form.register("title_ar", {
              required: "Title is required.",
            })}
          />
          {inlineErrors.title_ar ? (
            <FieldError>{inlineErrors.title_ar}</FieldError>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="chapter_kitab">Chapter (Arabic)</Label>
            <Input
              id="chapter_kitab"
              dir="rtl"
              lang="ar"
              placeholder="كتاب"
              {...form.register("chapter_kitab", {
                required: "Chapter is required.",
              })}
            />
            {inlineErrors.chapter_kitab ? (
              <FieldError>{inlineErrors.chapter_kitab}</FieldError>
            ) : null}
          </div>

          <div>
            <Label htmlFor="chapter_bab">Section (Arabic)</Label>
            <Input
              id="chapter_bab"
              dir="rtl"
              lang="ar"
              placeholder="باب"
              {...form.register("chapter_bab")}
            />
          </div>

          <div>
            <Label htmlFor="chapter_fasl">Subsection (Arabic)</Label>
            <Input
              id="chapter_fasl"
              dir="rtl"
              lang="ar"
              placeholder="فصل"
              {...form.register("chapter_fasl")}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="duration_seconds">Duration (seconds)</Label>
            <Input
              id="duration_seconds"
              type="number"
              inputMode="numeric"
              {...form.register("duration_seconds", {
                required: "Duration is required.",
                valueAsNumber: true,
              })}
            />
            {inlineErrors.duration_seconds ? (
              <FieldError>{inlineErrors.duration_seconds}</FieldError>
            ) : null}
          </div>

          <div>
            <Label htmlFor="upload_date">Upload Date</Label>
            <Input
              id="upload_date"
              type="date"
              {...form.register("upload_date", {
                required: "Upload date is required.",
              })}
            />
            {inlineErrors.upload_date ? (
              <FieldError>{inlineErrors.upload_date}</FieldError>
            ) : null}
          </div>

          <div>
            <Label htmlFor="telegram_post_id">Telegram Post ID</Label>
            <Input
              id="telegram_post_id"
              type="number"
              inputMode="numeric"
              {...form.register("telegram_post_id", {
                required: "Telegram post ID is required.",
                valueAsNumber: true,
              })}
            />
            {inlineErrors.telegram_post_id ? (
              <FieldError>{inlineErrors.telegram_post_id}</FieldError>
            ) : null}
          </div>
        </div>

        <div>
          <Label htmlFor="archive_url">Audio URL</Label>
          <Input
            id="archive_url"
            readOnly
            {...form.register("archive_url", {
              required: "Audio URL is required.",
            })}
          />
          <p className="mt-1 text-xs text-text-secondary">
            Uploaded from Internet Archive
          </p>
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
          {form.formState.isSubmitting ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.replace("/admin")}
        >
          Cancel
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
