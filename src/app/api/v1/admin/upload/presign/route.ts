import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generatePresignedUrl } from "@/lib/internet-archive";
import { buildError, buildSuccess } from "@/utils/response";
import { logger } from "@/lib/logger";

function getRetryAfterSeconds(reset: number): number {
  const resetMs = reset < 1_000_000_000_000 ? reset * 1000 : reset;
  return Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
}

const PresignRequestSchema = z.object({
  volume: z.coerce.number().int().min(1).max(4).describe("Lesson volume (1-4)"),
  lesson_number: z.coerce
    .number()
    .int()
    .min(1)
    .describe("Lesson number within volume"),
  content_type: z
    .enum(["audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav"])
    .optional()
    .default("audio/mpeg")
    .describe("MIME type of audio file"),
});

export async function POST(req: NextRequest) {
  // Rate limit check
  const rateLimitModule = await import("@/lib/rate-limit");
  const rateLimitResult = await rateLimitModule.checkPresignRateLimit(
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

  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      buildError("INVALID_JSON", "Request body must be valid JSON"),
      { status: 400 },
    );
  }

  const parsed = PresignRequestSchema.safeParse(body);

  if (!parsed.success) {
    const errors = Object.fromEntries(
      parsed.error.issues.map((issue) => [issue.path.join("."), issue.message]),
    );

    return NextResponse.json(
      buildError("VALIDATION_ERROR", "Request body validation failed", errors),
      { status: 422 },
    );
  }

  const { volume, lesson_number, content_type } = parsed.data;

  try {
    const presignData = await generatePresignedUrl(
      volume,
      lesson_number,
      content_type,
      Math.floor(Number(process.env.UPLOAD_PRESIGN_EXPIRY_SECONDS ?? "900")),
    );

    logger.info({
      action: "upload.presign",
      volume,
      lesson_number,
      filename: presignData.filename,
    });

    return NextResponse.json(buildSuccess(presignData), { status: 200 });
  } catch (err) {
    logger.error({
      action: "upload.presign.failed",
      error: err instanceof Error ? err.message : String(err),
    });

    return NextResponse.json(
      buildError("PRESIGN_FAILED", "Failed to generate presigned URL"),
      { status: 502 },
    );
  }
}
