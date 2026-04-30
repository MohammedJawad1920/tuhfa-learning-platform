import { z } from "zod";

/**
 * Chapter schema - used in both Lesson and create/update bodies
 */
const ChapterSchema = z.object({
  kitab: z.string().trim().min(1, "kitab must be non-empty"),
  bab: z.string().nullable().optional(),
  fasl: z.string().nullable().optional(),
});

/**
 * LessonCreateSchema - validates admin input for creating a new lesson
 * NOTE: id is NOT accepted here (server-assigned), and upload_date should be ISO date
 */
export const LessonCreateSchema = z
  .object({
    volume: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)], {
      errorMap: () => ({ message: "volume must be 1, 2, 3, or 4" }),
    }),
    lesson_number: z.number().int().positive("lesson_number must be > 0"),
    title_ar: z.string().trim().min(1, "title_ar must be non-empty"),
    chapter: ChapterSchema,
    duration_seconds: z.number().int().positive("duration_seconds must be > 0"),
    upload_date: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "upload_date must be ISO 8601 date (YYYY-MM-DD)",
      ),
    archive_url: z
      .string()
      .url("archive_url must be a valid URL")
      .startsWith(
        "https://archive.org/download/",
        "archive_url must start with https://archive.org/download/",
      ),
    telegram_post_id: z.number().int().positive("telegram_post_id must be > 0"),
  })
  .strip(); // Remove unknown fields

/**
 * LessonUpdateSchema - validates admin input for updating an existing lesson
 * All fields are optional (partial update)
 */
export const LessonUpdateSchema = z
  .object({
    volume: z
      .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
      .optional(),
    lesson_number: z.number().int().positive().optional(),
    title_ar: z.string().trim().min(1).optional(),
    chapter: ChapterSchema.optional(),
    duration_seconds: z.number().int().positive().optional(),
    upload_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    archive_url: z
      .string()
      .url()
      .startsWith(
        "https://archive.org/download/",
        "archive_url must start with https://archive.org/download/",
      )
      .optional(),
    telegram_post_id: z.number().int().positive().optional(),
  })
  .strip(); // Remove unknown fields

/**
 * Typed exports for validation
 */
export type LessonCreate = z.infer<typeof LessonCreateSchema>;
export type LessonUpdate = z.infer<typeof LessonUpdateSchema>;
