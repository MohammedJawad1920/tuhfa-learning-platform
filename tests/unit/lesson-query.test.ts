import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  LessonIdSchema,
  LessonListQuerySchema,
} from "@/schemas/lesson-query.schema";
import { GET as getLessons } from "@/app/api/v1/lessons/route";
import { GET as getLessonById } from "@/app/api/v1/lessons/[id]/route";

describe("lesson query validation", () => {
  it("parses valid list query params and applies defaults", () => {
    const parsed = LessonListQuerySchema.parse({
      volume: "1",
      kitab: "كتاب الطهارة",
      bab: "باب الماء",
      search: "الطهارة",
      limit: "25",
      offset: "10",
    });

    expect(parsed).toEqual({
      volume: 1,
      kitab: "كتاب الطهارة",
      bab: "باب الماء",
      search: "الطهارة",
      limit: 25,
      offset: 10,
    });
  });

  it("rejects short search terms", () => {
    const result = LessonListQuerySchema.safeParse({ search: "a" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("at least 2");
    }
  });

  it("rejects id values below 1", () => {
    const result = LessonIdSchema.safeParse("0");
    expect(result.success).toBe(false);
  });

  it("returns 400 for invalid volume types", async () => {
    const request = new NextRequest(
      "http://localhost/api/v1/lessons?volume=abc",
    );
    const response = await getLessons(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 422 for validation failures like short search", async () => {
    const request = new NextRequest("http://localhost/api/v1/lessons?search=a");
    const response = await getLessons(request);

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid lesson ids", async () => {
    const request = new NextRequest("http://localhost/api/v1/lessons/abc");
    const response = await getLessonById(request, { params: { id: "abc" } });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });
});
