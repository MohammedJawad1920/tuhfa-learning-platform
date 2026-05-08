import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

import { env } from "@/config/env";
import { uploadToIA } from "@/lib/internet-archive";
import { buildError, buildSuccess } from "@/utils/response";

export const runtime = "nodejs";

function getRetryAfterSeconds(reset: number): number {
  const resetMs = reset < 1_000_000_000_000 ? reset * 1000 : reset;
  return Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
}

function getStringValue(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" ? value : null;
}

export async function POST(req: NextRequest) {
  const rateLimitModule = await import("@/lib/rate-limit");
  const rateLimitResult = await rateLimitModule.checkUploadRateLimit(
    req.headers,
  );

  if (!rateLimitResult.success) {
    const retryAfterSeconds = getRetryAfterSeconds(rateLimitResult.reset);

    return NextResponse.json(
      buildError("RATE_LIMITED", "Too many requests. Please try again later.", {
        retryAfterSeconds,
      }),
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      },
    );
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      buildError("INVALID_CONTENT_TYPE", "Expected multipart/form-data"),
      { status: 400 },
    );
  }

  let formData: FormData;

  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      buildError("INVALID_REQUEST", "Unable to parse multipart data"),
      { status: 400 },
    );
  }

  const fileEntry = formData.get("file") ?? formData.get("audio");
  if (!(fileEntry instanceof File)) {
    return NextResponse.json(buildError("MISSING_FILE", "No file uploaded"), {
      status: 400,
    });
  }

  const volumeRaw = getStringValue(formData.get("volume"));
  const lessonNumberRaw = getStringValue(formData.get("lesson_number"));

  if (!volumeRaw || !["1", "2", "3", "4"].includes(volumeRaw)) {
    return NextResponse.json(
      buildError("INVALID_VOLUME", "Volume must be 1-4"),
      { status: 422 },
    );
  }

  if (!lessonNumberRaw || !/^[1-9][0-9]*$/.test(lessonNumberRaw)) {
    return NextResponse.json(
      buildError("INVALID_LESSON_NUMBER", "lesson_number is invalid"),
      { status: 422 },
    );
  }

  const volume = Number(volumeRaw);
  const lesson_number = Number(lessonNumberRaw);
  const stream = Readable.fromWeb(fileEntry.stream() as any);

  try {
    const res = await uploadToIA(
      stream,
      volume,
      lesson_number,
      fileEntry.type || "application/octet-stream",
      { volume, lesson_number },
    );

    return NextResponse.json(
      buildSuccess({
        archive_url: res.archive_url,
        filename: res.filename,
        size_bytes: res.size_bytes,
      }),
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      buildError("UPLOAD_FAILED", "Failed to upload to Internet Archive"),
      { status: 502 },
    );
  }
}
