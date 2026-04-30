import { describe, it, expect } from "vitest";
import {
  LessonCreateSchema,
  LessonUpdateSchema,
} from "@/schemas/lesson.schema";
import { AuthSchema } from "@/schemas/auth.schema";

describe("LessonCreateSchema", () => {
  const validLessonCreate = {
    volume: 1 as const,
    lesson_number: 1,
    title_ar: "قول المصنف",
    chapter: {
      kitab: "كتاب الطهارة",
      bab: "باب الماء",
      fasl: null,
    },
    duration_seconds: 3720,
    upload_date: "2023-01-15",
    archive_url:
      "https://archive.org/download/tuhfat-al-muhtaj-abdulhakim-saadi/lesson-v1-001.mp3",
    telegram_post_id: 12,
  };

  it("should validate a correct LessonCreate body", () => {
    const result = LessonCreateSchema.safeParse(validLessonCreate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validLessonCreate);
    }
  });

  it("should reject archive_url not starting with https://archive.org/download/", () => {
    const invalid = {
      ...validLessonCreate,
      archive_url: "https://example.com/file.mp3",
    };
    const result = LessonCreateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "archive_url must start with https://archive.org/download/",
      );
    }
  });

  it("should reject volume not in enum {1,2,3,4}", () => {
    const invalid = {
      ...validLessonCreate,
      volume: 5,
    };
    const result = LessonCreateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "volume must be 1, 2, 3, or 4",
      );
    }
  });

  it("should reject empty title_ar", () => {
    const invalid = {
      ...validLessonCreate,
      title_ar: "",
    };
    const result = LessonCreateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "title_ar must be non-empty",
      );
    }
  });

  it("should reject title_ar with only whitespace", () => {
    const invalid = {
      ...validLessonCreate,
      title_ar: "   ",
    };
    const result = LessonCreateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "title_ar must be non-empty",
      );
    }
  });

  it("should reject duration_seconds <= 0", () => {
    const invalid = {
      ...validLessonCreate,
      duration_seconds: 0,
    };
    const result = LessonCreateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "duration_seconds must be > 0",
      );
    }
  });

  it("should reject lesson_number <= 0", () => {
    const invalid = {
      ...validLessonCreate,
      lesson_number: 0,
    };
    const result = LessonCreateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "lesson_number must be > 0",
      );
    }
  });

  it("should reject empty chapter.kitab", () => {
    const invalid = {
      ...validLessonCreate,
      chapter: {
        kitab: "",
        bab: "باب الماء",
        fasl: null,
      },
    };
    const result = LessonCreateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "kitab must be non-empty",
      );
    }
  });

  it("should reject invalid upload_date format", () => {
    const invalid = {
      ...validLessonCreate,
      upload_date: "2023/01/15", // Wrong format
    };
    const result = LessonCreateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should strip unknown fields", () => {
    const invalid = {
      ...validLessonCreate,
      unknownField: "should be stripped",
    };
    const result = LessonCreateSchema.safeParse(invalid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("unknownField");
      expect(result.data.title_ar).toBe(validLessonCreate.title_ar);
    }
  });

  it("should allow null bab and fasl", () => {
    const valid = {
      ...validLessonCreate,
      chapter: {
        kitab: "كتاب الطهارة",
        bab: null,
        fasl: null,
      },
    };
    const result = LessonCreateSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

describe("LessonUpdateSchema", () => {
  const validUpdate = {
    title_ar: "Updated title",
    duration_seconds: 5000,
  };

  it("should validate partial update with only some fields", () => {
    const result = LessonUpdateSchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title_ar).toBe("Updated title");
      expect(result.data.duration_seconds).toBe(5000);
    }
  });

  it("should allow empty object (all optional)", () => {
    const result = LessonUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should reject invalid archive_url if provided", () => {
    const invalid = {
      archive_url: "https://example.com/file.mp3",
    };
    const result = LessonUpdateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should reject volume not in enum if provided", () => {
    const invalid = {
      volume: 5,
    };
    const result = LessonUpdateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("AuthSchema", () => {
  it("should validate correct password", () => {
    const result = AuthSchema.safeParse({ password: "myPassword123" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.password).toBe("myPassword123");
    }
  });

  it("should reject empty password", () => {
    const result = AuthSchema.safeParse({ password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("password is required");
    }
  });

  it("should reject password > 128 characters", () => {
    const longPassword = "a".repeat(129);
    const result = AuthSchema.safeParse({ password: longPassword });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "at most 128 characters",
      );
    }
  });

  it("should accept password of exactly 128 characters", () => {
    const maxPassword = "a".repeat(128);
    const result = AuthSchema.safeParse({ password: maxPassword });
    expect(result.success).toBe(true);
  });

  it("should strip unknown fields", () => {
    const invalid = {
      password: "myPassword",
      extra: "field",
    };
    const result = AuthSchema.safeParse(invalid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("extra");
      expect(result.data.password).toBe("myPassword");
    }
  });
});
