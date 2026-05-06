"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { createLesson } from "@/api/endpoints";
import { Button } from "@/components/ui/Button";
import { FieldError, Label } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";

type WizardStep = "upload" | "form" | "submitting" | "done";

type UploadFormValues = {
  file: FileList | null;
  volume: "1" | "2" | "3" | "4";
  lesson_number: string;
};

type LessonFormValues = {
  volume: "1" | "2" | "3" | "4";
  lesson_number: string;
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

const acceptedMimeTypes = ["audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav"];

function fileToFormData(values: UploadFormValues): FormData | null {
  const file = values.file?.item(0);
  if (!file) {
    return null;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("volume", values.volume);
  formData.append("lesson_number", values.lesson_number);
  return formData;
}

function normalizeText(value: string | undefined | null): string {
  return value?.trim() ?? "";
}

function safeJsonParse(body: string | null): any {
  if (!body) return null;

  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

export function AddLessonWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const uploadXhrRef = useRef<XMLHttpRequest | null>(null);
  const [step, setStep] = useState<WizardStep>("upload");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [archiveUrl, setArchiveUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [inlineErrors, setInlineErrors] = useState<InlineErrorState>({});

  const uploadForm = useForm<UploadFormValues>({
    defaultValues: {
      file: null,
      volume: "1",
      lesson_number: "",
    },
  });

  const lessonForm = useForm<LessonFormValues>({
    defaultValues: {
      volume: "1",
      lesson_number: "",
      title_ar: "",
      chapter_kitab: "",
      chapter_bab: "",
      chapter_fasl: "",
      duration_seconds: "",
      upload_date: "",
      archive_url: "",
      telegram_post_id: "",
    },
  });

  useEffect(() => {
    if (archiveUrl) {
      lessonForm.setValue("archive_url", archiveUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [archiveUrl, lessonForm]);

  const handleUploadSubmit = uploadForm.handleSubmit(async (values) => {
    const file = values.file?.item(0);

    setInlineErrors({});
    setToast(null);

    if (!file) {
      setInlineErrors({ file: "يجب اختيار ملف صوتي" });
      return;
    }

    if (!acceptedMimeTypes.includes(file.type)) {
      setInlineErrors({ file: "نوع الملف غير مدعوم" });
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setInlineErrors({ file: "File exceeds 500MB" });
      return;
    }

    const formData = fileToFormData(values);
    if (!formData) {
      setInlineErrors({ file: "يجب اختيار ملف صوتي" });
      return;
    }

    const xhr = new XMLHttpRequest();
    uploadXhrRef.current = xhr;
    setStep("upload");
    setUploadProgress(0);

    const result = await new Promise<Response | null>((resolve) => {
      xhr.open("POST", "/api/v1/admin/upload");
      xhr.withCredentials = true;
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () => {
        const response = new Response(xhr.responseText, {
          status: xhr.status,
          headers: { "content-type": "application/json" },
        });
        resolve(response);
      };
      xhr.onerror = () => resolve(null);
      xhr.send(formData);
    });

    if (!result) {
      setInlineErrors({ file: "Internet Archive unreachable — retry" });
      return;
    }

    const body = safeJsonParse(await result.text());
    const status = result.status;

    if (status === 401) {
      router.replace("/admin/login");
      return;
    }

    if (status === 413) {
      setInlineErrors({ file: "File exceeds 500MB" });
      return;
    }

    if (status === 422) {
      setInlineErrors({
        file: body?.error?.message ?? "البيانات غير صالحة",
      });
      return;
    }

    if (status === 429) {
      setInlineErrors({ file: "تم تجاوز الحد — حاول لاحقاً" });
      return;
    }

    if (status !== 200) {
      setInlineErrors({ file: "Internet Archive unreachable — retry" });
      return;
    }

    const nextArchiveUrl = body?.data?.archive_url as string | undefined;
    if (!nextArchiveUrl) {
      setInlineErrors({ file: "Internet Archive unreachable — retry" });
      return;
    }

    setArchiveUrl(nextArchiveUrl);
    setStep("form");
    lessonForm.setValue("volume", values.volume, { shouldDirty: true });
    lessonForm.setValue("lesson_number", values.lesson_number, {
      shouldDirty: true,
    });
    lessonForm.setValue("archive_url", nextArchiveUrl, {
      shouldDirty: true,
      shouldValidate: true,
    });
  });

  const handleLessonSubmit = lessonForm.handleSubmit(async (values) => {
    setInlineErrors({});
    setToast(null);
    setStep("submitting");

    const chapter = {
      kitab: normalizeText(values.chapter_kitab),
      bab: normalizeText(values.chapter_bab) || null,
      fasl: normalizeText(values.chapter_fasl) || null,
    };

    const body = {
      volume: Number(values.volume),
      lesson_number: Number(values.lesson_number),
      title_ar: values.title_ar.trim(),
      chapter,
      duration_seconds: Number(values.duration_seconds),
      upload_date: values.upload_date,
      archive_url: values.archive_url,
      telegram_post_id: Number(values.telegram_post_id),
    };

    try {
      const response = await createLesson(body);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lessons", "all"] }),
        queryClient.invalidateQueries({
          queryKey: ["admin", "lessons", "all"],
        }),
      ]);
      setStep("done");
      setToast({
        open: true,
        variant: "success",
        message: "تم حفظ الدرس بنجاح",
      });

      const lessonId = response?.data?.lesson?.id;
      if (typeof lessonId === "number") {
        router.replace("/admin");
      }
    } catch (error) {
      const status = (error as { status?: number })?.status;
      const bodyError = (error as { body?: any })?.body;

      if (status === 401) {
        router.replace("/admin/login");
        return;
      }

      if (status === 409) {
        setToast({
          open: true,
          variant: "error",
          message: "تعارض — أعد المحاولة",
        });
        setStep("form");
        return;
      }

      if (status === 422) {
        const details = bodyError?.error?.details ?? {};
        setInlineErrors(
          Object.fromEntries(
            Object.entries(details).map(([key, value]) => [key, String(value)]),
          ),
        );
        setStep("form");
        return;
      }

      setToast({
        open: true,
        variant: "error",
        message: "فشل حفظ الدرس",
      });
      setStep("form");
    }
  });

  return (
    <main className="min-h-screen bg-surface px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface-card p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-text-secondary" aria-current="step">
              الخطوة{" "}
              {step === "form" || step === "submitting" || step === "done"
                ? "2"
                : "1"}{" "}
              من 2
            </p>
            <h1 className="mt-1 text-heading text-text-primary">
              إضافة درس جديد
            </h1>
          </div>

          {step === "form" ? (
            <span className="text-sm text-success">تم رفع الملف</span>
          ) : null}
        </div>

        {step === "upload" ? (
          <form onSubmit={handleUploadSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="volume">المجلد</Label>
                <select
                  id="volume"
                  className="block w-full rounded-md border border-border bg-surface-card px-3 py-2 text-sm text-text-primary shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  {...uploadForm.register("volume", { required: true })}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </div>

              <div>
                <Label htmlFor="lesson_number">رقم الدرس</Label>
                <Input
                  id="lesson_number"
                  inputMode="numeric"
                  {...uploadForm.register("lesson_number", {
                    required: "رقم الدرس مطلوب",
                    pattern: {
                      value: /^[1-9][0-9]*$/,
                      message: "رقم الدرس غير صالح",
                    },
                  })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="file">الملف الصوتي</Label>
              <Input
                id="file"
                type="file"
                accept={acceptedMimeTypes.join(",")}
                {...uploadForm.register("file", { required: true })}
              />
              {inlineErrors.file ? (
                <FieldError>{inlineErrors.file}</FieldError>
              ) : null}
              {uploadForm.formState.errors.file ? (
                <FieldError>يجب اختيار ملف صوتي</FieldError>
              ) : null}
            </div>

            <ProgressBar value={uploadProgress} label="تقدم الرفع" />

            <Button type="submit">رفع الملف</Button>
          </form>
        ) : null}

        {step === "form" || step === "submitting" || step === "done" ? (
          <form onSubmit={handleLessonSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="title_ar">العنوان العربي</Label>
                <Textarea
                  id="title_ar"
                  rows={3}
                  {...lessonForm.register("title_ar", {
                    required: "العنوان العربي مطلوب",
                  })}
                />
                {inlineErrors.title_ar ? (
                  <FieldError>{inlineErrors.title_ar}</FieldError>
                ) : null}
              </div>

              <div>
                <Label htmlFor="archive_url">archive_url</Label>
                <Input
                  id="archive_url"
                  readOnly
                  {...lessonForm.register("archive_url")}
                />
                <p className="mt-1 text-xs text-text-secondary">
                  الرابط يُملأ تلقائياً بعد الرفع.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="chapter_kitab">الكتاب</Label>
                <Input
                  id="chapter_kitab"
                  {...lessonForm.register("chapter_kitab", {
                    required: "الكتاب مطلوب",
                  })}
                />
                {inlineErrors.chapter_kitab ? (
                  <FieldError>{inlineErrors.chapter_kitab}</FieldError>
                ) : null}
              </div>
              <div>
                <Label htmlFor="chapter_bab">الباب</Label>
                <Input
                  id="chapter_bab"
                  {...lessonForm.register("chapter_bab")}
                />
              </div>
              <div>
                <Label htmlFor="chapter_fasl">الفصل</Label>
                <Input
                  id="chapter_fasl"
                  {...lessonForm.register("chapter_fasl")}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="duration_seconds">المدة بالثواني</Label>
                <Input
                  id="duration_seconds"
                  type="number"
                  inputMode="numeric"
                  {...lessonForm.register("duration_seconds", {
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
                  {...lessonForm.register("upload_date", {
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
                  inputMode="numeric"
                  {...lessonForm.register("telegram_post_id", {
                    required: "معرف المنشور مطلوب",
                  })}
                />
                {inlineErrors.telegram_post_id ? (
                  <FieldError>{inlineErrors.telegram_post_id}</FieldError>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={step === "submitting"}
                loading={step === "submitting"}
              >
                {step === "submitting" ? "جارٍ الحفظ" : "حفظ الدرس"}
              </Button>
              <Button type="button" variant="secondary" disabled>
                رجوع
              </Button>
            </div>
          </form>
        ) : null}
      </div>

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

export default AddLessonWizard;
