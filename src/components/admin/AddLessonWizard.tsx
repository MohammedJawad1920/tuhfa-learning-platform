"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { createLesson, presignUpload } from "@/api/endpoints";
import { Button } from "@/components/ui/Button";
import { FieldError, Label } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";

type WizardStep = "upload" | "form" | "submitting" | "done";

type UploadFormValues = {
  file: FileList | null;
  volume: 1 | 2 | 3 | 4;
  lesson_number: string;
  content_type?: string;
};

type LessonFormValues = {
  volume: 1 | 2 | 3 | 4;
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

type ToastState = {
  open: boolean;
  variant: "success" | "error" | "warning";
  message: string;
};

const acceptedMimeTypes = ["audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav"];

function normalizeText(value: string | undefined | null): string {
  return value?.trim() ?? "";
}

function buildCurlCommand(url: string, contentType: string, fileName: string) {
  const isWindows =
    typeof navigator !== "undefined" &&
    navigator.platform.toLowerCase().includes("win");
  const curlBinary = isWindows ? "curl.exe" : "curl";
  const escapedFileName = fileName.replace(/"/g, '\\"');

  return `${curlBinary} -X PUT "${url}" -H "Content-Type: ${contentType}" --data-binary @"${escapedFileName}"`;
}

export function AddLessonWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const uploadXhrRef = useRef<XMLHttpRequest | null>(null);

  const [step, setStep] = useState<WizardStep>("upload");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [archiveUrl, setArchiveUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showCurlFallback, setShowCurlFallback] = useState(false);
  const [curlCommand, setCurlCommand] = useState<string>("");
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [requestNewLink, setRequestNewLink] = useState(false);

  const uploadForm = useForm<UploadFormValues>({
    defaultValues: {
      file: null,
      volume: 1,
      lesson_number: "",
    },
  });

  const lessonForm = useForm<LessonFormValues>({
    defaultValues: {
      volume: 1,
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
        shouldValidate: true,
      });
    }
  }, [archiveUrl, lessonForm]);

  const handleUploadSubmit = uploadForm.handleSubmit(async (values) => {
    const file = values.file?.item(0);

    setUploadError(null);
    setToast(null);
    setShowCurlFallback(false);
    setRequestNewLink(false);

    if (!file) {
      setUploadError("Please select a file.");
      return;
    }

    if (!acceptedMimeTypes.includes(file.type)) {
      setUploadError("This file type is not supported.");
      return;
    }

    // Client-side guard: reject file > 500MB before any API call
    if (file.size > 500 * 1024 * 1024) {
      setUploadError("File exceeds 500MB.");
      return;
    }

    setStep("upload");
    setUploadProgress(0);

    try {
      // Step 1: Call presignUpload
      const presignResponse = await presignUpload({
        volume: Number(values.volume) as 1 | 2 | 3 | 4,
        lesson_number: Number(values.lesson_number),
        content_type: file.type || "audio/mpeg",
      });

      const presignData = presignResponse?.data;
      if (!presignData?.presigned_url) {
        setUploadError("Failed to get upload URL.");
        setStep("upload");
        return;
      }

      const archiveUrlToUse = presignData.archive_url || "";
      const presignedUrl = presignData.presigned_url;
      const contentType = file.type || "audio/mpeg";

      // Step 2: XHR PUT to presigned URL
      const xhr = new XMLHttpRequest();
      uploadXhrRef.current = xhr;

      const xhrResult = await new Promise<{
        status: number;
        text: string;
      } | null>((resolve) => {
        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.withCredentials = false; // IA presigned URLs don't need credentials

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        };

        xhr.onload = () => {
          resolve({
            status: xhr.status,
            text: xhr.responseText,
          });
        };

        xhr.onerror = () => {
          // Status 0 = CORS block or network error
          resolve({
            status: 0,
            text: "",
          });
        };

        xhr.send(file);
      });

      if (!xhrResult) {
        setUploadError("Upload failed. Please try again.");
        setStep("upload");
        return;
      }

      // Handle different response statuses
      if (xhrResult.status === 0) {
        // CORS block - show curl fallback
        const curlCmd = buildCurlCommand(presignedUrl, contentType, file.name);
        setCurlCommand(curlCmd);
        setShowCurlFallback(true);
        setArchiveUrl(archiveUrlToUse);
        return;
      }

      if (xhrResult.status === 200) {
        // Success
        setArchiveUrl(archiveUrlToUse);
        setUploadProgress(100);
        // Advance to step 2 automatically
        lessonForm.setValue("volume", values.volume, { shouldValidate: true });
        lessonForm.setValue("lesson_number", values.lesson_number, {
          shouldValidate: true,
        });
        lessonForm.setValue("archive_url", archiveUrlToUse, {
          shouldValidate: true,
        });
        setStep("form");
        return;
      }

      if (xhrResult.status === 403) {
        // Presign URL expired
        setUploadError("Upload link expired. Request a new one.");
        setRequestNewLink(true);
        setStep("upload");
        return;
      }

      if (xhrResult.status === 429) {
        // Rate limited - parse Retry-After header
        const retryAfter = xhr.getResponseHeader("Retry-After");
        const retryMsg = retryAfter
          ? `Rate limit exceeded. Try again in ${retryAfter} seconds.`
          : "Rate limit exceeded. Try again later.";
        setUploadError(retryMsg);
        setStep("upload");
        return;
      }

      if (xhrResult.status === 502) {
        setUploadError("Upload service unavailable. Please try again.");
        setStep("upload");
        return;
      }

      // Other errors
      setUploadError("Upload failed. Please try again.");
      setStep("upload");
    } catch (error) {
      const status = (error as { status?: number })?.status;

      if (status === 401) {
        router.replace("/admin/login");
        return;
      }

      if (status === 422) {
        const body = (error as { body?: Record<string, unknown> })?.body;
        const message =
          (body?.error as Record<string, unknown>)?.message || "Invalid input.";
        setUploadError(String(message));
        setStep("upload");
        return;
      }

      if (status === 429) {
        setUploadError("Rate limit exceeded. Try again in a few minutes.");
        setStep("upload");
        return;
      }

      if (status === 502) {
        setUploadError("Upload service unavailable. Please try again.");
        setStep("upload");
        return;
      }

      setUploadError("Upload failed. Please try again.");
      setStep("upload");
    }
  });

  const handleLessonSubmit = lessonForm.handleSubmit(async (values) => {
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
      await createLesson(body);
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
        message: "Lesson created.",
      });
      router.replace("/admin");
    } catch (error) {
      const status = (error as { status?: number })?.status;
      const bodyError = (
        error as { body?: { error?: Record<string, unknown> } }
      )?.body;

      if (status === 401) {
        router.replace("/admin/login");
        return;
      }

      if (status === 409) {
        setToast({
          open: true,
          variant: "error",
          message: "Duplicate lesson number in this volume.",
        });
        setStep("form");
        return;
      }

      if (status === 422) {
        const details =
          (bodyError?.error?.details as Record<string, unknown>) || {};
        const fieldErrors = Object.fromEntries(
          Object.entries(details).map(([key, value]) => [key, String(value)]),
        );
        Object.entries(fieldErrors).forEach(([key, value]) => {
          lessonForm.setError(key as keyof LessonFormValues, {
            message: String(value),
          });
        });
        setStep("form");
        return;
      }

      setToast({
        open: true,
        variant: "error",
        message: "Failed to create lesson.",
      });
      setStep("form");
    }
  });

  const stepNumber =
    step === "form" || step === "submitting" || step === "done" ? 2 : 1;

  return (
    <main className="min-h-screen bg-surface px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface-card p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p
              className="text-sm text-text-secondary"
              aria-current={step !== "done" ? "step" : undefined}
            >
              Step {stepNumber} of 2
            </p>
            <h1 className="mt-1 text-heading text-text-primary">Add Lesson</h1>
          </div>

          {step === "form" || step === "submitting" || step === "done" ? (
            <span className="text-sm text-success">Upload complete</span>
          ) : null}
        </div>

        {toast?.open && (
          <Toast
            open={true}
            variant={toast.variant}
            onClose={() => setToast(null)}
          >
            {toast.message}
          </Toast>
        )}

        {step === "upload" ? (
          <form onSubmit={handleUploadSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="volume">Volume</Label>
                <select
                  id="volume"
                  className="block w-full rounded-md border border-border bg-surface-card px-3 py-2 text-sm text-text-primary shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  {...uploadForm.register("volume", {
                    required: true,
                    valueAsNumber: true,
                  })}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>

              <div>
                <Label htmlFor="lesson_number">Lesson #</Label>
                <Input
                  id="lesson_number"
                  inputMode="numeric"
                  placeholder="e.g., 1, 2, 3"
                  {...uploadForm.register("lesson_number", {
                    required: "Lesson number is required.",
                    pattern: {
                      value: /^[1-9][0-9]*$/,
                      message: "Lesson number must be positive.",
                    },
                  })}
                />
                {uploadForm.formState.errors.lesson_number && (
                  <FieldError>
                    {uploadForm.formState.errors.lesson_number.message}
                  </FieldError>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="file">Audio File</Label>
              <Input
                id="file"
                type="file"
                accept={acceptedMimeTypes.join(",")}
                aria-describedby="file-help"
                {...uploadForm.register("file", { required: true })}
              />
              <p id="file-help" className="mt-1 text-xs text-text-secondary">
                Accepted: MP3, M4A, OGG, WAV (max 500MB)
              </p>
              {uploadError && <FieldError>{uploadError}</FieldError>}
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <ProgressBar value={uploadProgress} label="Upload progress" />
            )}

            {showCurlFallback && (
              <div className="rounded-md border border-border bg-surface p-4">
                <p className="mb-3 text-sm text-text-secondary">
                  Browser upload blocked (CORS). Use this command from the
                  folder that contains the audio file. On Windows, run it in
                  PowerShell or Command Prompt:
                </p>
                <div className="mb-3 flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded bg-background px-3 py-2 text-xs font-mono">
                    {curlCommand}
                  </code>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(curlCommand);
                      setCopiedCurl(true);
                      setTimeout(() => setCopiedCurl(false), 2000);
                    }}
                  >
                    {copiedCurl ? "Copied" : "Copy"}
                  </Button>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    setShowCurlFallback(false);
                    setArchiveUrl(archiveUrl);
                    lessonForm.setValue("archive_url", archiveUrl || "", {
                      shouldValidate: true,
                    });
                    setStep("form");
                  }}
                >
                  I uploaded successfully →
                </Button>
              </div>
            )}

            {requestNewLink && (
              <Button
                type="button"
                onClick={() => {
                  setRequestNewLink(false);
                  setUploadError(null);
                  uploadForm.reset();
                }}
              >
                Request new upload link
              </Button>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={step !== "upload"}>
                Request Upload Link
              </Button>
            </div>
          </form>
        ) : null}

        {step === "form" || step === "submitting" || step === "done" ? (
          <form onSubmit={handleLessonSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title_ar">Title (Arabic)</Label>
              <Textarea
                id="title_ar"
                rows={3}
                dir="rtl"
                lang="ar"
                placeholder="اكتب عنوان الدرس بالعربية"
                {...lessonForm.register("title_ar", {
                  required: "Title is required.",
                })}
              />
              {lessonForm.formState.errors.title_ar && (
                <FieldError>
                  {lessonForm.formState.errors.title_ar.message}
                </FieldError>
              )}
            </div>

            <div>
              <Label htmlFor="archive_url">Audio URL</Label>
              <Input
                id="archive_url"
                readOnly
                {...lessonForm.register("archive_url")}
              />
              <p className="mt-1 text-xs text-text-secondary">
                Auto-filled after successful upload
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="chapter_kitab">Chapter (Arabic)</Label>
                <Input
                  id="chapter_kitab"
                  dir="rtl"
                  lang="ar"
                  placeholder="كتاب"
                  {...lessonForm.register("chapter_kitab", {
                    required: "Chapter is required.",
                  })}
                />
                {lessonForm.formState.errors.chapter_kitab && (
                  <FieldError>
                    {lessonForm.formState.errors.chapter_kitab.message}
                  </FieldError>
                )}
              </div>
              <div>
                <Label htmlFor="chapter_bab">Section (Arabic)</Label>
                <Input
                  id="chapter_bab"
                  dir="rtl"
                  lang="ar"
                  placeholder="باب"
                  {...lessonForm.register("chapter_bab")}
                />
              </div>
              <div>
                <Label htmlFor="chapter_fasl">Subsection (Arabic)</Label>
                <Input
                  id="chapter_fasl"
                  dir="rtl"
                  lang="ar"
                  placeholder="فصل"
                  {...lessonForm.register("chapter_fasl")}
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
                  placeholder="e.g., 3600"
                  {...lessonForm.register("duration_seconds", {
                    required: "Duration is required.",
                    valueAsNumber: true,
                  })}
                />
                {lessonForm.formState.errors.duration_seconds && (
                  <FieldError>
                    {lessonForm.formState.errors.duration_seconds.message}
                  </FieldError>
                )}
              </div>
              <div>
                <Label htmlFor="upload_date">Upload Date</Label>
                <Input
                  id="upload_date"
                  type="date"
                  {...lessonForm.register("upload_date", {
                    required: "Upload date is required.",
                  })}
                />
                {lessonForm.formState.errors.upload_date && (
                  <FieldError>
                    {lessonForm.formState.errors.upload_date.message}
                  </FieldError>
                )}
              </div>
              <div>
                <Label htmlFor="telegram_post_id">Telegram Post ID</Label>
                <Input
                  id="telegram_post_id"
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g., 123"
                  {...lessonForm.register("telegram_post_id", {
                    required: "Telegram post ID is required.",
                    valueAsNumber: true,
                  })}
                />
                {lessonForm.formState.errors.telegram_post_id && (
                  <FieldError>
                    {lessonForm.formState.errors.telegram_post_id.message}
                  </FieldError>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={step === "submitting"}
                loading={step === "submitting"}
              >
                {step === "submitting" ? "Saving..." : "Save Lesson"}
              </Button>
              <Button type="button" variant="secondary" disabled>
                Back
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </main>
  );
}

export default AddLessonWizard;
