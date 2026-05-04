import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const fetchLessonsMock = vi.fn();
const checkPublicRateLimitMock = vi.fn();

vi.mock("@/lib/github", async () => {
  class UpstreamError extends Error {}

  return {
    fetchLessons: fetchLessonsMock,
    UpstreamError,
  };
});

vi.mock("@/lib/rate-limit", () => ({
  checkPublicRateLimit: checkPublicRateLimitMock,
}));

import { GET } from "@/app/api/v1/lessons/[id]/route";

describe("lessons by id route", () => {
  beforeEach(() => {
    fetchLessonsMock.mockReset();
    checkPublicRateLimitMock.mockReset();
    checkPublicRateLimitMock.mockResolvedValue({
      success: true,
      limit: 120,
      remaining: 119,
      reset: Date.now() + 60_000,
    });
  });

  it("returns the lesson when found", async () => {
    fetchLessonsMock.mockResolvedValue({
      data: {
        version: 1,
        last_updated: "2026-05-03T00:00:00.000Z",
        lessons: [
          {
            id: 7,
            volume: 1,
            lesson_number: 7,
            title_ar: "درس",
            chapter: { kitab: "كتاب الطهارة", bab: "باب الماء", fasl: null },
            duration_seconds: 3600,
            upload_date: "2026-05-03",
            archive_url: "https://archive.org/download/col/lesson-v1-007.mp3",
            telegram_post_id: 10,
          },
        ],
      },
      sha: "abc123",
    });

    const request = new NextRequest("http://localhost/api/v1/lessons/7");
    const response = await GET(request, { params: { id: "7" } });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.lesson.id).toBe(7);
    expect(body.data.lesson.title_ar).toBe("درس");
    expect(typeof body.meta.requestId).toBe("string");
    expect(typeof body.meta.timestamp).toBe("string");
    expect(fetchLessonsMock).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when the lesson is missing", async () => {
    fetchLessonsMock.mockResolvedValue({
      data: {
        version: 1,
        last_updated: "2026-05-03T00:00:00.000Z",
        lessons: [],
      },
      sha: "abc123",
    });

    const request = new NextRequest("http://localhost/api/v1/lessons/99");
    const response = await GET(request, { params: { id: "99" } });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Lesson not found");
  });

  it("returns 502 when GitHub is unavailable", async () => {
    const { UpstreamError } = await import("@/lib/github");
    fetchLessonsMock.mockRejectedValue(new UpstreamError("boom"));

    const request = new NextRequest("http://localhost/api/v1/lessons/7");
    const response = await GET(request, { params: { id: "7" } });

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error.code).toBe("UPSTREAM_ERROR");
    expect(body.error.message).toContain("GitHub");
  });
});
