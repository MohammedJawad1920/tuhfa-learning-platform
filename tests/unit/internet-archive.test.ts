import { describe, it, expect, beforeEach } from "vitest";

beforeEach(() => {
  // Ensure required env variables exist for the module under test
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
  process.env.REVALIDATION_SECRET = "R".repeat(32);
  process.env.UPLOAD_PRESIGN_EXPIRY_SECONDS = "900";
});

describe("internet-archive client", () => {
  it("generateIAFilename produces correct format", async () => {
    const { generateIAFilename } = await import("@/lib/internet-archive");

    expect(generateIAFilename(1, 214)).toBe("lesson-v1-214.mp3");
    expect(generateIAFilename(2, 5)).toBe("lesson-v2-005.mp3");
    expect(generateIAFilename(4, 111)).toBe("lesson-v4-111.mp3");
  });

  it("UploadError is exported", async () => {
    const { UploadError } = await import("@/lib/internet-archive");

    expect(UploadError).toBeDefined();
    expect(typeof UploadError).toBe("function");

    const err = new UploadError("test");
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("test");
  });

  it("generatePresignedUrl is exported and is an async function", async () => {
    const { generatePresignedUrl } = await import("@/lib/internet-archive");

    expect(generatePresignedUrl).toBeDefined();
    expect(typeof generatePresignedUrl).toBe("function");
  });
});
