import { NextRequest, NextResponse } from "next/server";

import * as github from "@/lib/github";
import { LessonUpdateSchema } from "@/schemas/lesson.schema";
import { LessonsFile, Lesson } from "@/types/lesson";
import { buildError, buildSuccess } from "@/utils/response";
import { logger } from "@/lib/logger";
import { triggerRevalidation } from "@/utils/revalidate";

function getRetryAfterSeconds(reset: number): number {
  const resetMs = reset < 1_000_000_000_000 ? reset * 1000 : reset;
  return Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
}

function buildValidationDetails(
  issues: { path: (string | number)[]; message: string }[],
) {
  return Object.fromEntries(
    issues.map((issue) => [issue.path.join("."), issue.message]),
  );
}

function sanitizeUpdatePayload(body: Record<string, unknown>) {
  const { id, volume, lesson_number, ...rest } = body;
  void id;
  void volume;
  void lesson_number;
  return rest;
}

function mergeChapter(
  current: Lesson["chapter"],
  patch?: Partial<Lesson["chapter"]>,
): Lesson["chapter"] {
  if (!patch) return current;

  return {
    kitab: patch.kitab ?? current.kitab,
    bab: patch.bab ?? current.bab,
    fasl: patch.fasl ?? current.fasl,
  };
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const rateLimitModule = await import("@/lib/rate-limit");
  const rateLimitResult = await rateLimitModule.checkAdminWriteRateLimit(
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
        headers: { "Retry-After": String(retryAfterSeconds) },
      },
    );
  }

  const params = await context.params;
  const parsedId = Number(params.id);

  if (!Number.isInteger(parsedId) || parsedId < 1) {
    return NextResponse.json(
      buildError("BAD_REQUEST", "ID is not a valid positive integer", {
        id: "id must be a positive integer",
      }),
      { status: 400 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      buildError("BAD_REQUEST", "Invalid JSON body", {}),
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      buildError("VALIDATION_ERROR", "Request validation failed", {
        body: "Request body must be an object",
      }),
      { status: 422 },
    );
  }

  const sanitizedBody = sanitizeUpdatePayload(body as Record<string, unknown>);
  const parsed = LessonUpdateSchema.safeParse(sanitizedBody);

  if (!parsed.success) {
    return NextResponse.json(
      buildError(
        "VALIDATION_ERROR",
        "Request validation failed",
        buildValidationDetails(parsed.error.issues),
      ),
      { status: 422 },
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      buildError("VALIDATION_ERROR", "Request validation failed", {
        body: "At least one mutable field must be provided",
      }),
      { status: 422 },
    );
  }

  try {
    const lessonsFile = (await github.fetchLessons()) as {
      data: LessonsFile;
      sha: string;
    };
    const existingLessons = lessonsFile.data.lessons ?? [];
    const lessonIndex = existingLessons.findIndex(
      (lesson) => lesson.id === parsedId,
    );

    if (lessonIndex === -1) {
      return NextResponse.json(
        buildError("NOT_FOUND", "Lesson not found", {}),
        { status: 404 },
      );
    }

    const currentLesson = existingLessons[lessonIndex];
    const updatedLesson: Lesson = {
      ...currentLesson,
      ...parsed.data,
      chapter: mergeChapter(currentLesson.chapter, parsed.data.chapter),
    };

    const updatedLessons = [...existingLessons];
    updatedLessons[lessonIndex] = updatedLesson;

    await github.updateLessons(
      {
        ...lessonsFile.data,
        last_updated: new Date().toISOString(),
        lessons: updatedLessons,
      },
      lessonsFile.sha,
      `Update lesson ${parsedId}`,
    );

    triggerRevalidation();

    const responseBody = buildSuccess({ lesson: updatedLesson });

    logger.info(
      {
        route: "/api/v1/admin/lessons/[id]",
        method: "PUT",
        statusCode: 200,
        action: "lesson.update",
        lessonId: parsedId,
        requestId: responseBody.meta.requestId,
      },
      "Admin updated lesson",
    );

    return NextResponse.json(responseBody, { status: 200 });
  } catch (error) {
    if (error instanceof github.ConflictError) {
      return NextResponse.json(
        buildError(
          "CONCURRENT_EDIT_CONFLICT",
          "Concurrent edit detected. Please retry.",
          {},
        ),
        { status: 409 },
      );
    }

    if (error instanceof github.UpstreamError) {
      return NextResponse.json(
        buildError("UPSTREAM_ERROR", "Unable to reach GitHub API"),
        { status: 502 },
      );
    }

    throw error;
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const rateLimitModule = await import("@/lib/rate-limit");
  const rateLimitResult = await rateLimitModule.checkAdminWriteRateLimit(
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
        headers: { "Retry-After": String(retryAfterSeconds) },
      },
    );
  }

  const params = await context.params;
  const parsedId = Number(params.id);

  if (!Number.isInteger(parsedId) || parsedId < 1) {
    return NextResponse.json(
      buildError("BAD_REQUEST", "ID is not a valid positive integer", {
        id: "id must be a positive integer",
      }),
      { status: 400 },
    );
  }

  try {
    const lessonsFile = (await github.fetchLessons()) as {
      data: LessonsFile;
      sha: string;
    };
    const existingLessons = lessonsFile.data.lessons ?? [];
    const lessonIndex = existingLessons.findIndex(
      (lesson) => lesson.id === parsedId,
    );

    if (lessonIndex === -1) {
      return NextResponse.json(
        buildError("NOT_FOUND", "Lesson not found", {}),
        { status: 404 },
      );
    }

    const updatedLessons = existingLessons.filter(
      (lesson) => lesson.id !== parsedId,
    );

    await github.updateLessons(
      {
        ...lessonsFile.data,
        last_updated: new Date().toISOString(),
        lessons: updatedLessons,
      },
      lessonsFile.sha,
      `Delete lesson ${parsedId}`,
    );

    triggerRevalidation();

    logger.info(
      {
        route: "/api/v1/admin/lessons/[id]",
        method: "DELETE",
        statusCode: 204,
        action: "lesson.delete",
        lessonId: parsedId,
      },
      "Admin deleted lesson",
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof github.ConflictError) {
      return NextResponse.json(
        buildError(
          "CONCURRENT_EDIT_CONFLICT",
          "Concurrent edit detected. Please retry.",
          {},
        ),
        { status: 409 },
      );
    }

    if (error instanceof github.UpstreamError) {
      return NextResponse.json(
        buildError("UPSTREAM_ERROR", "Unable to reach GitHub API"),
        { status: 502 },
      );
    }

    throw error;
  }
}
