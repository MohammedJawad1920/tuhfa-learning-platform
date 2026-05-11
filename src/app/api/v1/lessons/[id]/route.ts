import { NextRequest, NextResponse } from "next/server";
import { LessonIdSchema } from "@/schemas/lesson-query.schema";
import { buildError, buildSuccess } from "@/utils/response";

function getRetryAfterSeconds(reset: number): number {
  const resetMs = reset < 1_000_000_000_000 ? reset * 1000 : reset;
  return Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const rateLimitModule = await import("@/lib/rate-limit");
  const rateLimitResult = await rateLimitModule.checkPublicRateLimit(
    request.headers,
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

  try {
    const githubModule = await import("@/lib/github");
    const lesson = await githubModule.getLessonById(parsed.data);

    if (!lesson) {
      return NextResponse.json(
        buildError("NOT_FOUND", "Lesson not found", {}),
        { status: 404 },
      );
    }

    return NextResponse.json(buildSuccess({ lesson }), { status: 200 });
  } catch (error) {
    const githubModule = await import("@/lib/github").catch(() => null);
    if (githubModule && error instanceof githubModule.UpstreamError) {
      return NextResponse.json(
        buildError("UPSTREAM_ERROR", "Unable to load lesson from GitHub"),
        { status: 502 },
      );
    }

    throw error;
  }
}
