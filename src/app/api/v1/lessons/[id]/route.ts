import { NextRequest, NextResponse } from "next/server";
import { LessonIdSchema } from "@/schemas/lesson-query.schema";
import { buildError } from "@/utils/response";

function getRetryAfterSeconds(reset: number): number {
  const resetMs = reset < 1_000_000_000_000 ? reset * 1000 : reset;
  return Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const rateLimitModule = await import("@/lib/rate-limit");
  const rateLimitResult = await rateLimitModule.checkPublicRateLimit(
    _request.headers,
  );

  if (!rateLimitResult.success) {
    const retryAfterSeconds = getRetryAfterSeconds(rateLimitResult.reset);

    return NextResponse.json(
      buildError("RATE_LIMITED", "Too many requests. Please try again later.", {
        retryAfterSeconds,
      }),
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
        },
      },
    );
  }

  const params = await context.params;
  const parsed = LessonIdSchema.safeParse(params.id);

  if (!parsed.success) {
    return NextResponse.json(
      buildError("BAD_REQUEST", "ID is not a valid integer", {
        id: parsed.error.issues[0]?.message ?? "id must be a positive integer",
      }),
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
