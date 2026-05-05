import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";

describe("Integration: /api/v1/admin/lessons (POST)", () => {
  const baseUrl = "http://127.0.0.1:3000/api/v1";
  let sessionCookie: string | undefined;

  beforeAll(async () => {
    // Authenticate to get session cookie for admin routes
    const authRes = await fetch(`${baseUrl}/admin/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || "test" }),
    });

    const setCookie = authRes.headers.get("set-cookie");
    if (setCookie) {
      sessionCookie = setCookie.split(";")[0]; // Extract just the cookie value
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/admin/lessons", () => {
    it("creates a new lesson with auto-assigned id and returns 201", async () => {
      const lessonData = {
        volume: 1,
        lesson_number: 999,
        title_ar: "اختبار درس جديد",
        chapter: {
          kitab: "كتاب الطهارة",
          bab: "باب الماء",
          fasl: null,
        },
        duration_seconds: 3600,
        upload_date: "2026-05-01",
        archive_url:
          "https://archive.org/download/tuhfat-al-muhtaj-abdulhakim-saadi/lesson-v1-999.mp3",
        telegram_post_id: 12345,
      };

      const res = await fetch(`${baseUrl}/admin/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionCookie && { cookie: sessionCookie }),
        },
        body: JSON.stringify(lessonData),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("data");
      expect(body.data).toHaveProperty("lesson");
      expect(body.data.lesson).toHaveProperty("id");
      expect(typeof body.data.lesson.id).toBe("number");
      expect(body.data.lesson.volume).toBe(1);
      expect(body.data.lesson.lesson_number).toBe(999);
      expect(body.data.lesson.title_ar).toBe("اختبار درس جديد");
      expect(body).toHaveProperty("meta");
      expect(body.meta).toHaveProperty("requestId");
      expect(body.meta).toHaveProperty("timestamp");
    });

    it("returns 422 validation error for missing required field", async () => {
      const lessonData = {
        volume: 1,
        // lesson_number missing
        title_ar: "اختبار",
        chapter: { kitab: "كتاب", bab: null, fasl: null },
        duration_seconds: 3600,
        upload_date: "2026-05-01",
        archive_url: "https://archive.org/download/test/test.mp3",
        telegram_post_id: 123,
      };

      const res = await fetch(`${baseUrl}/admin/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionCookie && { cookie: sessionCookie }),
        },
        body: JSON.stringify(lessonData),
      });

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.details).toBeDefined();
    });

    it("returns 422 validation error for invalid volume", async () => {
      const lessonData = {
        volume: 5, // Invalid: must be 1-4
        lesson_number: 1,
        title_ar: "اختبار",
        chapter: { kitab: "كتاب", bab: null, fasl: null },
        duration_seconds: 3600,
        upload_date: "2026-05-01",
        archive_url: "https://archive.org/download/test/test.mp3",
        telegram_post_id: 123,
      };

      const res = await fetch(`${baseUrl}/admin/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionCookie && { cookie: sessionCookie }),
        },
        body: JSON.stringify(lessonData),
      });

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error.details).toHaveProperty("volume");
    });

    it("returns 422 validation error for invalid archive_url", async () => {
      const lessonData = {
        volume: 1,
        lesson_number: 1,
        title_ar: "اختبار",
        chapter: { kitab: "كتاب", bab: null, fasl: null },
        duration_seconds: 3600,
        upload_date: "2026-05-01",
        archive_url: "https://invalid.org/test.mp3", // Must start with archive.org/download/
        telegram_post_id: 123,
      };

      const res = await fetch(`${baseUrl}/admin/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionCookie && { cookie: sessionCookie }),
        },
        body: JSON.stringify(lessonData),
      });

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error.details).toHaveProperty("archive_url");
    });

    it("returns 422 validation error for invalid upload_date format", async () => {
      const lessonData = {
        volume: 1,
        lesson_number: 1,
        title_ar: "اختبار",
        chapter: { kitab: "كتاب", bab: null, fasl: null },
        duration_seconds: 3600,
        upload_date: "01-05-2026", // Invalid: must be YYYY-MM-DD
        archive_url: "https://archive.org/download/test/test.mp3",
        telegram_post_id: 123,
      };

      const res = await fetch(`${baseUrl}/admin/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionCookie && { cookie: sessionCookie }),
        },
        body: JSON.stringify(lessonData),
      });

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error.details).toHaveProperty("upload_date");
    });

    it("returns 400 for invalid JSON body", async () => {
      const res = await fetch(`${baseUrl}/admin/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionCookie && { cookie: sessionCookie }),
        },
        body: "invalid json {",
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe("BAD_REQUEST");
    });

    it("returns 401 when session cookie is missing", async () => {
      const lessonData = {
        volume: 1,
        lesson_number: 1,
        title_ar: "اختبار",
        chapter: { kitab: "كتاب", bab: null, fasl: null },
        duration_seconds: 3600,
        upload_date: "2026-05-01",
        archive_url: "https://archive.org/download/test/test.mp3",
        telegram_post_id: 123,
      };

      const res = await fetch(`${baseUrl}/admin/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lessonData),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("DELETE /api/v1/admin/lessons/{id}", () => {
    it("deletes an existing lesson and returns 204", async () => {
      const lessonNumber = Math.floor(Date.now() % 100000) || 10001;
      const lessonData = {
        volume: 1,
        lesson_number: lessonNumber,
        title_ar: "اختبار حذف درس",
        chapter: {
          kitab: "كتاب الطهارة",
          bab: null,
          fasl: null,
        },
        duration_seconds: 1800,
        upload_date: "2026-05-01",
        archive_url:
          "https://archive.org/download/tuhfat-al-muhtaj-abdulhakim-saadi/lesson-v1-test-delete.mp3",
        telegram_post_id: 54321,
      };

      const createRes = await fetch(`${baseUrl}/admin/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionCookie && { cookie: sessionCookie }),
        },
        body: JSON.stringify(lessonData),
      });

      expect(createRes.status).toBe(201);
      const createBody = await createRes.json();
      const lessonId = createBody.data.lesson.id as number;

      const deleteRes = await fetch(`${baseUrl}/admin/lessons/${lessonId}`, {
        method: "DELETE",
        headers: {
          ...(sessionCookie && { cookie: sessionCookie }),
        },
      });

      expect(deleteRes.status).toBe(204);
      expect(await deleteRes.text()).toBe("");

      const getRes = await fetch(`${baseUrl}/lessons/${lessonId}`);
      expect(getRes.status).toBe(404);
    });

    it("returns 404 when lesson does not exist", async () => {
      const res = await fetch(`${baseUrl}/admin/lessons/9999999`, {
        method: "DELETE",
        headers: {
          ...(sessionCookie && { cookie: sessionCookie }),
        },
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 400 for invalid lesson id", async () => {
      const res = await fetch(`${baseUrl}/admin/lessons/not-a-number`, {
        method: "DELETE",
        headers: {
          ...(sessionCookie && { cookie: sessionCookie }),
        },
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe("BAD_REQUEST");
    });

    it("returns 401 when session cookie is missing", async () => {
      const res = await fetch(`${baseUrl}/admin/lessons/1`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });
});
