import { NextRequest, NextResponse } from "next/server";
import { LessonListQuerySchema } from "@/schemas/lesson-query.schema";
import { buildError, buildSuccess } from "@/utils/response";

function getRetryAfterSeconds(reset: number): number {
  const resetMs = reset < 1_000_000_000_000 ? reset * 1000 : reset;
  return Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
}

export async function GET(request: NextRequest) {
  const cacheHeaders = {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  };

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

  const parsed = LessonListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );

  if (!parsed.success) {
    const hasTypeError = parsed.error.issues.some(
      (issue) =>
        issue.code === "invalid_type" || issue.code === "invalid_union",
    );

    return NextResponse.json(
      buildError(
        hasTypeError ? "BAD_REQUEST" : "VALIDATION_ERROR",
        hasTypeError
          ? "Invalid query parameter type"
          : "Query validation failed",
        Object.fromEntries(
          parsed.error.issues.map((issue) => [
            issue.path.join("."),
            issue.message,
          ]),
        ),
      ),
      { status: hasTypeError ? 400 : 422 },
    );
  }

  const { volume, kitab, bab, fasl, search, limit, offset } = parsed.data;

  try {
    const githubModule = await import("@/lib/github");
    const { lessons, total } = await githubModule.getLessons(
      { volume, kitab, bab, fasl, search },
      { limit, offset },
    );

    return NextResponse.json(
      buildSuccess(
        { lessons },
        {
          total,
          limit,
          offset,
        },
      ),
      { status: 200, headers: cacheHeaders },
    );
  } catch (error) {
    const githubModule = await import("@/lib/github").catch(() => null);
    if (githubModule && error instanceof githubModule.UpstreamError) {
      return NextResponse.json(
        buildError("UPSTREAM_ERROR", "Unable to load lessons from GitHub"),
        { status: 502 },
      );
    }

    throw error;
  }
}
