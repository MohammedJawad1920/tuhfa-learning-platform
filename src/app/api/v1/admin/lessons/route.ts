import { NextRequest, NextResponse } from "next/server";

import { LessonCreateSchema } from "@/schemas/lesson.schema";
import { buildError, buildSuccess } from "@/utils/response";
import { logger } from "@/lib/logger";
import { Lesson, LessonsFile } from "@/types/lesson";
import * as github from "@/lib/github";
import { triggerRevalidation } from "@/utils/revalidate";

function getRetryAfterSeconds(reset: number): number {
  const resetMs = reset < 1_000_000_000_000 ? reset * 1000 : reset;
  return Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
}

function getNextId(lessons: Lesson[]): number {
  if (lessons.length === 0) return 1;
  return Math.max(...lessons.map((l) => l.id)) + 1;
}

function sortLessons(lessons: Lesson[]): Lesson[] {
  return [...lessons].sort((a, b) => {
    if (a.volume !== b.volume) return a.volume - b.volume;
    return a.lesson_number - b.lesson_number;
  });
}

function buildValidationDetails(
  issues: { path: (string | number)[]; message: string }[],
) {
  return Object.fromEntries(
    issues.map((issue) => [issue.path.join("."), issue.message]),
  );
}

export async function POST(request: NextRequest) {
  // Check admin write rate limit before processing body
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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      buildError("BAD_REQUEST", "Invalid JSON body", {}),
      { status: 400 },
    );
  }

  const parsed = LessonCreateSchema.safeParse(body);

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

  try {
    // Fetch current lessons.json + SHA from GitHub
    const lessonsFile = await github.fetchLessons();
    const { data, sha } = lessonsFile as {
      data: LessonsFile;
      sha: string;
    };
    const existingLessons = (data.lessons ?? []) as Lesson[];

    // Check uniqueness: volume + lesson_number
    const isDuplicate = existingLessons.some(
      (lesson) =>
        lesson.volume === parsed.data.volume &&
        lesson.lesson_number === parsed.data.lesson_number,
    );

    if (isDuplicate) {
      return NextResponse.json(
        buildError(
          "DUPLICATE_LESSON_NUMBER",
          "A lesson with this volume and lesson_number already exists",
          {
            volume: parsed.data.volume,
            lesson_number: parsed.data.lesson_number,
          },
        ),
        { status: 409 },
      );
    }

    // Assign server-generated id
    const newId = getNextId(existingLessons);
    const newLesson: Lesson = {
      ...parsed.data,
      id: newId,
    };

    // Append, sort, and update timestamp
    const updatedLessons = sortLessons([...existingLessons, newLesson]);
    const updatedFile: LessonsFile = {
      ...data,
      last_updated: new Date().toISOString(),
      lessons: updatedLessons,
    };

    // Commit to GitHub
    await github.updateLessons(
      updatedFile,
      sha,
      `Add lesson: Volume ${newLesson.volume} #${newLesson.lesson_number}`,
    );

    // Fire-and-forget revalidation
    triggerRevalidation();

    // Audit log
    logger.info(
      {
        route: "/api/v1/admin/lessons",
        method: "POST",
        statusCode: 201,
        action: "lesson.create",
        lessonId: newId,
        volume: newLesson.volume,
        lesson_number: newLesson.lesson_number,
        requestId: buildSuccess({ lesson: newLesson }).meta.requestId,
      },
      "Admin created lesson",
    );

    return NextResponse.json(buildSuccess({ lesson: newLesson }), {
      status: 201,
    });
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
