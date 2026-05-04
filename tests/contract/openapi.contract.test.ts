import { describe, it, expect } from "vitest";

/**
 * Contract tests validate that responses conform to OpenAPI schema.
 * These tests exercise the Prism mock server directly and verify
 * response shapes match the spec in docs/openapi.yaml.
 */
describe("Contract: OpenAPI compliance", () => {
  const prismBase = "http://127.0.0.1:4011"; // Prism mock server (raw port)

  describe("GET /lessons (via Prism mock)", () => {
    it("returns 200 with lessons list matching OpenAPI schema", async () => {
      const res = await fetch(`${prismBase}/lessons`);
      expect(res.status).toBe(200);
      const body = await res.json();

      // Verify response envelope
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("meta");

      // Verify data structure
      expect(body.data).toHaveProperty("lessons");
      expect(Array.isArray(body.data.lessons)).toBe(true);

      // Verify meta fields
      expect(body.meta).toHaveProperty("requestId");
      expect(body.meta).toHaveProperty("timestamp");
      expect(body.meta).toHaveProperty("total");
    });

    it("accepts pagination query parameters", async () => {
      const res = await fetch(`${prismBase}/lessons?limit=25&offset=10`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.meta).toHaveProperty("limit");
      expect(body.meta).toHaveProperty("offset");
    });

    it("returns valid lesson objects with required fields", async () => {
      const res = await fetch(`${prismBase}/lessons`);
      const body = await res.json();
      if (body.data.lessons.length > 0) {
        const lesson = body.data.lessons[0];
        expect(lesson).toHaveProperty("id");
        expect(typeof lesson.id).toBe("number");
        expect(lesson).toHaveProperty("volume");
        expect([1, 2, 3, 4]).toContain(lesson.volume);
        expect(lesson).toHaveProperty("title_ar");
        expect(lesson).toHaveProperty("chapter");
        expect(lesson.chapter).toHaveProperty("kitab");
      }
    });
  });

  describe("GET /lessons/{id} (via Prism mock)", () => {
    it("returns 200 with single lesson matching OpenAPI schema", async () => {
      const res = await fetch(`${prismBase}/lessons/1`);
      expect(res.status).toBe(200);
      const body = await res.json();

      // Verify response envelope
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("meta");

      // Verify data structure
      expect(body.data).toHaveProperty("lesson");
      const lesson = body.data.lesson;

      // Verify lesson has required fields per OpenAPI spec
      expect(lesson).toHaveProperty("id");
      expect(typeof lesson.id).toBe("number");
      expect(lesson.id).toBeGreaterThan(0);

      expect(lesson).toHaveProperty("volume");
      expect([1, 2, 3, 4]).toContain(lesson.volume);

      expect(lesson).toHaveProperty("lesson_number");
      expect(lesson.lesson_number).toBeGreaterThan(0);

      expect(lesson).toHaveProperty("title_ar");
      expect(typeof lesson.title_ar).toBe("string");

      expect(lesson).toHaveProperty("chapter");
      expect(lesson.chapter).toHaveProperty("kitab");

      expect(lesson).toHaveProperty("duration_seconds");
      expect(lesson.duration_seconds).toBeGreaterThan(0);

      expect(lesson).toHaveProperty("upload_date");
      expect(lesson).toHaveProperty("archive_url");
    });
  });

  describe("Response schema validation", () => {
    it("includes requestId in meta for all responses", async () => {
      const res = await fetch(`${prismBase}/lessons`);
      const body = await res.json();
      expect(body.meta.requestId).toBeDefined();
      expect(typeof body.meta.requestId).toBe("string");
    });

    it("includes timestamp in meta for all responses", async () => {
      const res = await fetch(`${prismBase}/lessons/1`);
      const body = await res.json();
      expect(body.meta.timestamp).toBeDefined();
      expect(typeof body.meta.timestamp).toBe("string");
    });
  });
});
