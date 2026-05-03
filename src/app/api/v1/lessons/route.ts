import { NextRequest, NextResponse } from "next/server";
import { LessonListQuerySchema } from "@/schemas/lesson-query.schema";
import { buildError, buildSuccess } from "@/utils/response";

export async function GET(request: NextRequest) {
  let githubModule: typeof import("@/lib/github") | undefined;

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

  try {
    githubModule = await import("@/lib/github");
    const lessonsFile = await githubModule.fetchLessons();
    const lessons = (lessonsFile.data as { lessons?: unknown[] }).lessons ?? [];

    return NextResponse.json(buildSuccess({ lessons }), { status: 200 });
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
