import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const checkAdminWriteRateLimitMock = vi.hoisted(() => vi.fn());
const fetchLessonsMock = vi.hoisted(() => vi.fn());
const updateLessonsMock = vi.hoisted(() => vi.fn());
const triggerRevalidationMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rate-limit", () => ({
  checkAdminWriteRateLimit: checkAdminWriteRateLimitMock,
}));

vi.mock("@/lib/github", () => ({
  fetchLessons: fetchLessonsMock,
  updateLessons: updateLessonsMock,
  ConflictError: class ConflictError extends Error {},
  UpstreamError: class UpstreamError extends Error {},
}));

vi.mock("@/utils/revalidate", () => ({
  triggerRevalidation: triggerRevalidationMock,
}));

import { DELETE, PUT } from "@/app/api/v1/admin/lessons/[id]/route";

const baseLesson = {
  id: 7,
  volume: 1,
  lesson_number: 7,
  title_ar: "درس قديم",
  chapter: { kitab: "كتاب الطهارة", bab: "باب الماء", fasl: null },
  duration_seconds: 3600,
  upload_date: "2026-05-01",
  archive_url: "https://archive.org/download/lesson-v1-007.mp3",
  telegram_post_id: 10,
};

describe("admin lessons id route", () => {
  beforeEach(() => {
    checkAdminWriteRateLimitMock.mockReset();
    checkAdminWriteRateLimitMock.mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60000,
    });
    fetchLessonsMock.mockReset();
    updateLessonsMock.mockReset();
    triggerRevalidationMock.mockReset();
  });

  it("partially updates lesson fields and revalidates", async () => {
    fetchLessonsMock.mockResolvedValue({
      data: { lessons: [baseLesson], last_updated: "2026-05-01T00:00:00Z" },
      sha: "abc123",
    });
    updateLessonsMock.mockResolvedValue({});

    const request = new NextRequest("http://localhost/api/v1/admin/lessons/7", {
      method: "PUT",
      body: JSON.stringify({ title_ar: "درس محدث" }),
      headers: { "content-type": "application/json" },
    });

    const response = await PUT(request, {
      params: Promise.resolve({ id: "7" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.lesson.title_ar).toBe("درس محدث");
    expect(body.data.lesson.chapter).toEqual(baseLesson.chapter);
    expect(updateLessonsMock).toHaveBeenCalledTimes(1);
    expect(triggerRevalidationMock).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when updating a missing lesson", async () => {
    fetchLessonsMock.mockResolvedValue({
      data: { lessons: [], last_updated: "2026-05-01T00:00:00Z" },
      sha: "abc123",
    });

    const request = new NextRequest(
      "http://localhost/api/v1/admin/lessons/99",
      {
        method: "PUT",
        body: JSON.stringify({ title_ar: "anything" }),
        headers: { "content-type": "application/json" },
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "99" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 409 on concurrent edit conflict during update", async () => {
    fetchLessonsMock.mockResolvedValue({
      data: { lessons: [baseLesson], last_updated: "2026-05-01T00:00:00Z" },
      sha: "abc123",
    });
    const { ConflictError } = await import("@/lib/github");
    updateLessonsMock.mockRejectedValueOnce(new ConflictError("conflict"));

    const request = new NextRequest("http://localhost/api/v1/admin/lessons/7", {
      method: "PUT",
      body: JSON.stringify({ title_ar: "درس محدث" }),
      headers: { "content-type": "application/json" },
    });

    const response = await PUT(request, {
      params: Promise.resolve({ id: "7" }),
    });

    expect(response.status).toBe(409);
  });

  it("deletes a lesson and revalidates", async () => {
    fetchLessonsMock.mockResolvedValue({
      data: { lessons: [baseLesson], last_updated: "2026-05-01T00:00:00Z" },
      sha: "abc123",
    });
    updateLessonsMock.mockResolvedValue({});

    const request = new NextRequest("http://localhost/api/v1/admin/lessons/7", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "7" }),
    });

    expect(response.status).toBe(204);
    expect(updateLessonsMock).toHaveBeenCalledTimes(1);
    expect(triggerRevalidationMock).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when deleting a missing lesson", async () => {
    fetchLessonsMock.mockResolvedValue({
      data: { lessons: [], last_updated: "2026-05-01T00:00:00Z" },
      sha: "abc123",
    });

    const request = new NextRequest(
      "http://localhost/api/v1/admin/lessons/99",
      {
        method: "DELETE",
        headers: { "content-type": "application/json" },
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "99" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 409 on concurrent edit conflict during delete", async () => {
    fetchLessonsMock.mockResolvedValue({
      data: { lessons: [baseLesson], last_updated: "2026-05-01T00:00:00Z" },
      sha: "abc123",
    });
    const { ConflictError } = await import("@/lib/github");
    updateLessonsMock.mockRejectedValueOnce(new ConflictError("conflict"));

    const request = new NextRequest("http://localhost/api/v1/admin/lessons/7", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "7" }),
    });

    expect(response.status).toBe(409);
  });
});
