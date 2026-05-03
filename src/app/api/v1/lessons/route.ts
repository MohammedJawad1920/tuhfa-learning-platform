import { NextRequest, NextResponse } from "next/server";
import { LessonListQuerySchema } from "@/schemas/lesson-query.schema";
import { buildError } from "@/utils/response";

export async function GET(request: NextRequest) {
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

  return NextResponse.json({ ok: true }, { status: 200 });
}
