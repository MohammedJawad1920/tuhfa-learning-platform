import { z } from "zod";

export const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]),
  ADMIN_PASSWORD: z.string().min(16),
  SESSION_SECRET: z.string().min(32),
  SESSION_MAX_AGE_SECONDS: z.coerce.number().int().positive(),
  GITHUB_TOKEN: z.string().min(1),
  GITHUB_REPO_OWNER: z.string().min(1),
  GITHUB_REPO_NAME: z.string().min(1),
  GITHUB_FILE_PATH: z.string().min(1),
  GITHUB_BRANCH: z.string().min(1),
  IA_ACCESS_KEY: z.string().min(1),
  IA_SECRET_KEY: z.string().min(1),
  IA_COLLECTION_IDENTIFIER: z.string().min(1),
  IA_S3_ENDPOINT: z.string().url(),
  UPSTASH_REDIS_REST_URL: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://"), {
      message: "UPSTASH_REDIS_REST_URL must be an HTTPS URL",
    }),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  ALLOWED_ORIGINS: z.string().min(1),
  REVALIDATION_SECRET: z.string().min(32),
  NEXT_PUBLIC_VERCEL_ANALYTICS_ID: z.string().optional().default(""),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return parsed.data;
}

export const env = parseEnv(process.env);
