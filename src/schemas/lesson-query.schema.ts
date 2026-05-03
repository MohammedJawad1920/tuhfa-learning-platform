import { z } from "zod";

export const LessonListQuerySchema = z
  .object({
    volume: z.coerce
      .number({ invalid_type_error: "volume must be an integer" })
      .int("volume must be an integer")
      .min(1, "volume must be one of 1, 2, 3, 4")
      .max(4, "volume must be one of 1, 2, 3, 4")
      .optional(),
    kitab: z
      .string({ invalid_type_error: "kitab must be a string" })
      .max(200, "kitab must be at most 200 characters")
      .optional(),
    bab: z
      .string({ invalid_type_error: "bab must be a string" })
      .max(200, "bab must be at most 200 characters")
      .optional(),
    search: z
      .string({ invalid_type_error: "search must be a string" })
      .min(2, "search must be at least 2 characters")
      .max(100, "search must be at most 100 characters")
      .optional(),
    limit: z.coerce
      .number({ invalid_type_error: "limit must be an integer" })
      .int("limit must be an integer")
      .min(1, "limit must be at least 1")
      .max(200, "limit must be at most 200")
      .default(50),
    offset: z.coerce
      .number({ invalid_type_error: "offset must be an integer" })
      .int("offset must be an integer")
      .min(0, "offset must be at least 0")
      .default(0),
  })
  .strip();

export const LessonIdSchema = z.coerce
  .number({ invalid_type_error: "id must be a positive integer" })
  .int("id must be a positive integer")
  .min(1, "id must be a positive integer");

export type LessonListQuery = z.infer<typeof LessonListQuerySchema>;
