import { describe, expect, it, vi } from "vitest";

const validEnv = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_API_BASE_URL: "http://localhost:3000/api/v1",
  NODE_ENV: "development",
  ADMIN_PASSWORD: "1234567890123456",
  SESSION_SECRET: "12345678901234567890123456789012",
  SESSION_MAX_AGE_SECONDS: "86400",
  GITHUB_TOKEN: "token",
  GITHUB_REPO_OWNER: "owner",
  GITHUB_REPO_NAME: "repo",
  GITHUB_FILE_PATH: "data/lessons.json",
  GITHUB_BRANCH: "main",
  IA_ACCESS_KEY: "ia-access",
  IA_SECRET_KEY: "ia-secret",
  IA_COLLECTION_IDENTIFIER: "tuhfat-al-muhtaj-abdulhakim-saadi",
  IA_S3_ENDPOINT: "https://s3.us.archive.org",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "upstash-token",
  ALLOWED_ORIGINS: "http://localhost:3000",
  REVALIDATION_SECRET: "12345678901234567890123456789012",
  NEXT_PUBLIC_VERCEL_ANALYTICS_ID: "",
};

describe("env validation", () => {
  it("throws at import time when ADMIN_PASSWORD is missing", async () => {
    const originalEnv = process.env;
    const envWithoutPassword = { ...validEnv };
    delete (envWithoutPassword as Record<string, string>).ADMIN_PASSWORD;

    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...envWithoutPassword,
    } as NodeJS.ProcessEnv;

    await expect(import("../../src/config/env")).rejects.toThrow(
      /ADMIN_PASSWORD/,
    );

    process.env = originalEnv;
  });

  it("throws at import time when ADMIN_PASSWORD is too short", async () => {
    const originalEnv = process.env;

    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...validEnv,
      ADMIN_PASSWORD: "short",
    } as NodeJS.ProcessEnv;

    await expect(import("../../src/config/env")).rejects.toThrow(
      /ADMIN_PASSWORD/,
    );

    process.env = originalEnv;
  });

  it("parses a valid environment", async () => {
    const originalEnv = process.env;

    vi.resetModules();
    process.env = { ...originalEnv, ...validEnv } as NodeJS.ProcessEnv;

    const { parseEnv } = await import("../../src/config/env");
    const parsed = parseEnv(validEnv);

    expect(parsed.ADMIN_PASSWORD).toBe(validEnv.ADMIN_PASSWORD);
    expect(parsed.SESSION_MAX_AGE_SECONDS).toBe(86400);
    expect(parsed.UPSTASH_REDIS_REST_URL).toBe(validEnv.UPSTASH_REDIS_REST_URL);

    process.env = originalEnv;
  });
});
