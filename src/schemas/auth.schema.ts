import { z } from "zod";

/**
 * AuthSchema - validates admin login credentials
 * Password must be 1-128 characters (enforced by this schema)
 */
export const AuthSchema = z
  .object({
    password: z
      .string()
      .min(1, "password is required")
      .max(128, "password must be at most 128 characters"),
  })
  .strip(); // Remove unknown fields

/**
 * Typed export for validation
 */
export type Auth = z.infer<typeof AuthSchema>;
