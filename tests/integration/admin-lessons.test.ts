import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const envMock = vi.hoisted(() => ({
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  REVALIDATION_SECRET: "test-secret-for-revalidation-webhook",
}));

vi.mock("@/config/env", () => ({
  env: envMock,
}));

const checkAdminWriteRateLimitMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rate-limit", () => ({
  checkAdminWriteRateLimit: checkAdminWriteRateLimitMock,
}));

const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: loggerMock,
}));

const githubMock = vi.hoisted(() => ({
  fetchLessons: vi.fn(),
  updateLessons: vi.fn(),
}));

vi.mock("@/lib/github", () => githubMock);

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

import { POST } from "@/app/api/v1/admin/lessons/route";
import { GET as GET_REVALIDATE } from "@/app/api/revalidate/route";

const mockLessons = [
  {
    id: 1,
    volume: 1,
    lesson_number: 1,
    title_ar: "درس الطهارة",
    chapter: { kitab: "كتاب الطهارة", bab: "باب الماء", fasl: null },
    duration_seconds: 1800,
    upload_date: "2026-01-01",
    archive_url: "https://archive.org/download/lesson-1.mp3",
    telegram_post_id: 1,
  },
];

describe("Unit: /api/v1/admin/lessons POST", () => {
  beforeEach(() => {
    checkAdminWriteRateLimitMock.mockReset();
    checkAdminWriteRateLimitMock.mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60000,
    });
    githubMock.fetchLessons.mockReset();
    githubMock.updateLessons.mockReset();
    vi.clearAllMocks();
  });

  it("creates a new lesson with auto-assigned id and returns 201", async () => {
    githubMock.fetchLessons.mockResolvedValueOnce({
      data: { lessons: mockLessons, last_updated: "2026-01-01T00:00:00Z" },
      sha: "abc123",
    });
    githubMock.updateLessons.mockResolvedValueOnce(undefined);

    const request = new NextRequest("http://localhost/api/v1/admin/lessons", {
      method: "POST",
      body: JSON.stringify({
        volume: 2,
        lesson_number: 2,
        title_ar: "درس جديد",
        chapter: { kitab: "كتاب الطهارة", bab: null, fasl: null },
        duration_seconds: 2400,
        upload_date: "2026-02-01",
        archive_url: "https://archive.org/download/lesson-2.mp3",
        telegram_post_id: 2,
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.lesson.id).toBe(2);
    expect(body.data.lesson.volume).toBe(2);
  });

  it("returns 422 validation error for missing required field", async () => {
    const request = new NextRequest("http://localhost/api/v1/admin/lessons", {
      method: "POST",
      body: JSON.stringify({
        volume: 1,
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid JSON body", async () => {
    const request = new NextRequest("http://localhost/api/v1/admin/lessons", {
      method: "POST",
      body: "invalid json {",
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 429 on rate limit", async () => {
    checkAdminWriteRateLimitMock.mockResolvedValueOnce({
      success: false,
      limit: 60,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const request = new NextRequest("http://localhost/api/v1/admin/lessons", {
      method: "POST",
      body: JSON.stringify({
        volume: 1,
        lesson_number: 1,
        title_ar: "test",
        chapter: { kitab: "test", bab: null, fasl: null },
        duration_seconds: 1800,
        upload_date: "2026-01-01",
        archive_url: "https://test.com/test.mp3",
        telegram_post_id: 1,
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(429);
  });
});

describe("Unit: /api/revalidate GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with correct secret", async () => {
    const request = new NextRequest(
      "http://localhost/api/revalidate?secret=test-secret-for-revalidation-webhook",
    );

    const response = await GET_REVALIDATE(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.revalidated).toBe(true);
  });

  it("returns 401 when secret is missing", async () => {
    const request = new NextRequest("http://localhost/api/revalidate");

    const response = await GET_REVALIDATE(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when secret is incorrect", async () => {
    const request = new NextRequest(
      "http://localhost/api/revalidate?secret=wrong-secret",
    );

    const response = await GET_REVALIDATE(request);

    expect(response.status).toBe(401);
  });
});
