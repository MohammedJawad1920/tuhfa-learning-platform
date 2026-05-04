import { describe, it, expect } from "vitest";

describe("Integration: /api/v1/lessons (mock proxy)", () => {
  const baseUrl = "http://127.0.0.1:4010/api/v1";

  describe("GET /lessons", () => {
    it("returns lessons list with meta", async () => {
      const res = await fetch(`${baseUrl}/lessons`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("data");
      expect(body.data).toHaveProperty("lessons");
      expect(Array.isArray(body.data.lessons)).toBe(true);
      expect(body).toHaveProperty("meta");
      expect(body.meta).toHaveProperty("requestId");
      expect(body.meta).toHaveProperty("timestamp");
      expect(body.meta).toHaveProperty("total");
    });

    it("returns Cache-Control header", async () => {
      const res = await fetch(`${baseUrl}/lessons`);
      expect(res.headers.get("Cache-Control")).toContain("s-maxage=60");
    });

    it("accepts pagination parameters", async () => {
      const res = await fetch(`${baseUrl}/lessons?limit=25&offset=10`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.meta).toHaveProperty("limit");
      expect(body.meta).toHaveProperty("offset");
    });

    it("returns valid lesson objects", async () => {
      const res = await fetch(`${baseUrl}/lessons`);
      const body = await res.json();
      if (body.data.lessons.length > 0) {
        const lesson = body.data.lessons[0];
        expect(lesson).toHaveProperty("id");
        expect(lesson).toHaveProperty("volume");
        expect(lesson).toHaveProperty("lesson_number");
        expect(lesson).toHaveProperty("title_ar");
        expect(lesson).toHaveProperty("chapter");
        expect(lesson).toHaveProperty("duration_seconds");
        expect(lesson).toHaveProperty("upload_date");
        expect(lesson).toHaveProperty("archive_url");
      }
    });
  });

  describe("GET /lessons/{id}", () => {
    it("returns single lesson by id", async () => {
      const res = await fetch(`${baseUrl}/lessons/1`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("data");
      expect(body.data).toHaveProperty("lesson");
      expect(body.data.lesson).toHaveProperty("id");
      expect(body).toHaveProperty("meta");
    });

    it("returns lesson with all required fields", async () => {
      const res = await fetch(`${baseUrl}/lessons/1`);
      const body = await res.json();
      const lesson = body.data.lesson;
      expect(typeof lesson.id).toBe("number");
      expect([1, 2, 3, 4]).toContain(lesson.volume);
      expect(typeof lesson.lesson_number).toBe("number");
      expect(typeof lesson.title_ar).toBe("string");
      expect(lesson.chapter).toHaveProperty("kitab");
      expect(typeof lesson.duration_seconds).toBe("number");
      expect(typeof lesson.upload_date).toBe("string");
      expect(typeof lesson.archive_url).toBe("string");
    });
  });
});
