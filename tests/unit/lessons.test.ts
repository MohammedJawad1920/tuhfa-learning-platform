import { describe, expect, it } from "vitest";
import {
  filterLessons,
  paginateLessons,
  filterAndPaginate,
} from "@/lib/lessons";
import { Lesson } from "@/types/lesson";

const mockLessons: Lesson[] = [
  {
    id: 1,
    volume: 1,
    lesson_number: 1,
    title_ar: "درس الطهارة",
    chapter: { kitab: "كتاب الطهارة", bab: "باب الماء", fasl: null },
    duration_seconds: 3600,
    upload_date: "2023-01-01",
    archive_url: "https://archive.org/download/col/lesson-v1-001.mp3",
    telegram_post_id: 1,
  },
  {
    id: 2,
    volume: 1,
    lesson_number: 2,
    title_ar: "درس الغسل",
    chapter: { kitab: "كتاب الطهارة", bab: "باب الغسل", fasl: null },
    duration_seconds: 3200,
    upload_date: "2023-01-02",
    archive_url: "https://archive.org/download/col/lesson-v1-002.mp3",
    telegram_post_id: 2,
  },
  {
    id: 3,
    volume: 2,
    lesson_number: 1,
    title_ar: "درس الصلاة",
    chapter: { kitab: "كتاب الصلاة", bab: "باب المواقيت", fasl: null },
    duration_seconds: 4000,
    upload_date: "2023-01-03",
    archive_url: "https://archive.org/download/col/lesson-v2-001.mp3",
    telegram_post_id: 3,
  },
];

describe("lesson filtering and pagination", () => {
  it("filters by volume", () => {
    const result = filterLessons(mockLessons, { volume: 1 });
    expect(result).toHaveLength(2);
    expect(result.every((l) => l.volume === 1)).toBe(true);
  });

  it("filters by kitab", () => {
    const result = filterLessons(mockLessons, { kitab: "كتاب الطهارة" });
    expect(result).toHaveLength(2);
    expect(result.every((l) => l.chapter.kitab === "كتاب الطهارة")).toBe(true);
  });

  it("filters by bab", () => {
    const result = filterLessons(mockLessons, { bab: "باب الماء" });
    expect(result).toHaveLength(1);
    expect(result[0]?.chapter.bab).toBe("باب الماء");
  });

  it("searches title_ar substring", () => {
    const result = filterLessons(mockLessons, { search: "الطهارة" });
    expect(result).toHaveLength(1);
    expect(result[0]?.title_ar).toContain("الطهارة");
  });

  it("combines multiple filters", () => {
    const result = filterLessons(mockLessons, {
      volume: 1,
      kitab: "كتاب الطهارة",
    });
    expect(result).toHaveLength(2);
    expect(
      result.every((l) => l.volume === 1 && l.chapter.kitab === "كتاب الطهارة"),
    ).toBe(true);
  });

  it("paginates lessons", () => {
    const result = paginateLessons(mockLessons, { limit: 2, offset: 0 });
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe(1);
    expect(result[1]?.id).toBe(2);
  });

  it("paginates with offset", () => {
    const result = paginateLessons(mockLessons, { limit: 2, offset: 1 });
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe(2);
    expect(result[1]?.id).toBe(3);
  });

  it("returns empty array for out-of-bounds offset", () => {
    const result = paginateLessons(mockLessons, {
      limit: 10,
      offset: 100,
    });
    expect(result).toHaveLength(0);
  });

  it("combines filtering and pagination", () => {
    const { filtered, paginated } = filterAndPaginate(
      mockLessons,
      { volume: 1 },
      { limit: 1, offset: 0 },
    );
    expect(filtered).toHaveLength(2);
    expect(paginated).toHaveLength(1);
    expect(paginated[0]?.id).toBe(1);
  });
});
