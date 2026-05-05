import { describe, it, beforeEach, expect, vi } from "vitest";
import { Readable } from "stream";

beforeEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4010";
  process.env.ADMIN_PASSWORD = "A".repeat(16);
  process.env.SESSION_SECRET = "S".repeat(32);
  process.env.SESSION_MAX_AGE_SECONDS = "86400";
  process.env.GITHUB_TOKEN = "test";
  process.env.GITHUB_REPO_OWNER = "owner";
  process.env.GITHUB_REPO_NAME = "repo";
  process.env.GITHUB_FILE_PATH = "data/lessons.json";
  process.env.GITHUB_BRANCH = "main";
  process.env.IA_ACCESS_KEY = "test-access-key";
  process.env.IA_SECRET_KEY = "test-secret-key";
  process.env.IA_COLLECTION_IDENTIFIER = "test-collection";
  process.env.IA_S3_ENDPOINT = "https://s3.us.archive.org";
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";
  process.env.ALLOWED_ORIGINS = "*";
  process.env.REVALIDATION_SECRET = "R".repeat(32);
});

describe("admin upload route", () => {
  it("returns 400 when no multipart content", async () => {
    const { POST } = await import("@/app/api/v1/admin/upload/route");

    const req = new Request("http://localhost/api/v1/admin/upload", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "hello",
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});
