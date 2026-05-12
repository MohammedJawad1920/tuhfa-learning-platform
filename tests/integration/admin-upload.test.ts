import { describe, it, beforeEach, expect, vi } from "vitest";
import { Readable } from "stream";

const checkPresignRateLimitMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rate-limit", () => ({
  checkPresignRateLimit: checkPresignRateLimitMock,
}));

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
  process.env.UPLOAD_PRESIGN_EXPIRY_SECONDS = "900";
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";
  process.env.REVALIDATION_SECRET = "R".repeat(32);
});

describe("admin presign upload route", () => {
  beforeEach(() => {
    checkPresignRateLimitMock.mockReset();
    checkPresignRateLimitMock.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60 * 60 * 1000,
    });
  });

  it("returns 400 when request body is not valid JSON", async () => {
    const { POST } = await import("@/app/api/v1/admin/upload/presign/route");

    const req = new Request("http://localhost/api/v1/admin/upload/presign", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "not json",
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("returns 422 on invalid volume", async () => {
    const { POST } = await import("@/app/api/v1/admin/upload/presign/route");

    const req = new Request("http://localhost/api/v1/admin/upload/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ volume: 5, lesson_number: 1 }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(422);
  });

  it("returns 422 on invalid lesson_number", async () => {
    const { POST } = await import("@/app/api/v1/admin/upload/presign/route");

    const req = new Request("http://localhost/api/v1/admin/upload/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ volume: 1, lesson_number: 0 }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(422);
  });

  it("returns 200 with presigned URL on valid request", async () => {
    const { POST } = await import("@/app/api/v1/admin/upload/presign/route");

    const req = new Request("http://localhost/api/v1/admin/upload/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        volume: 1,
        lesson_number: 100,
        content_type: "audio/mpeg",
      }),
    });

    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.presigned_url).toBeDefined();
    expect(data.data.archive_url).toBeDefined();
    expect(data.data.filename).toBe("lesson-v1-100.mp3");
    expect(data.data.method).toBe("PUT");
  });

  it("returns 422 on invalid content_type", async () => {
    const { POST } = await import("@/app/api/v1/admin/upload/presign/route");

    const req = new Request("http://localhost/api/v1/admin/upload/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        volume: 1,
        lesson_number: 100,
        content_type: "video/mp4",
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(422);
  });

  it("returns 429 on rate limit exceeded", async () => {
    checkPresignRateLimitMock.mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 3600 * 1000,
    });

    const { POST } = await import("@/app/api/v1/admin/upload/presign/route");

    const req = new Request("http://localhost/api/v1/admin/upload/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ volume: 1, lesson_number: 100 }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(429);
  });
});
