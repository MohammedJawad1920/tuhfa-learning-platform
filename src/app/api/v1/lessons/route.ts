import { NextRequest, NextResponse } from "next/server";
import { LessonListQuerySchema } from "@/schemas/lesson-query.schema";
import { buildError, buildSuccess } from "@/utils/response";
import { filterAndPaginate } from "@/lib/lessons";
import { Lesson } from "@/types/lesson";

export async function GET(request: NextRequest) {
  let githubModule: typeof import("@/lib/github") | undefined;
  const cacheHeaders = {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  };

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

  const { volume, kitab, bab, search, limit, offset } = parsed.data;

  try {
    githubModule = await import("@/lib/github");
    const lessonsFile = await githubModule.fetchLessons();
    const lessons = ((lessonsFile.data as { lessons?: unknown[] }).lessons ??
      []) as Lesson[];

    const { filtered, paginated } = filterAndPaginate(
      lessons,
      { volume, kitab, bab, search },
      { limit, offset },
    );

    return NextResponse.json(
      buildSuccess(
        { lessons: paginated },
        {
          total: filtered.length,
          limit,
          offset,
        },
      ),
      { status: 200, headers: cacheHeaders },
    );
  } catch (error) {
    if (githubModule && error instanceof githubModule.UpstreamError) {
      return NextResponse.json(
        buildError("UPSTREAM_ERROR", "Unable to load lessons from GitHub"),
        { status: 502 },
      );
    }

    throw error;
  }
}
