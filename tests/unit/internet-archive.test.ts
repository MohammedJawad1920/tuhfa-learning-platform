import { describe, it, expect, beforeEach, vi } from "vitest";

const getSignedUrlMock = vi.hoisted(() => vi.fn());

vi.mock("@aws-sdk/client-s3", () => {
  class PutObjectCommand {
    input: Record<string, unknown>;

    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }

  class S3Client {
    config: Record<string, unknown>;

    constructor(config: Record<string, unknown>) {
      this.config = config;
    }
  }

  return {
    PutObjectCommand,
    S3Client,
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: getSignedUrlMock,
}));

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

  it("generatePresignedUrl returns the expected presign payload", async () => {
    getSignedUrlMock.mockResolvedValueOnce("https://signed.example/presign");

    const { generatePresignedUrl } = await import("@/lib/internet-archive");

    const result = await generatePresignedUrl(1, 7, "audio/mpeg", 1200);

    expect(result).toEqual({
      presigned_url: "https://signed.example/presign",
      archive_url:
        "https://archive.org/download/test-collection/lesson-v1-007.mp3",
      filename: "lesson-v1-007.mp3",
      expires_in: 1200,
      method: "PUT",
      required_headers: { "Content-Type": "audio/mpeg" },
    });

    expect(getSignedUrlMock).toHaveBeenCalledTimes(1);
    const [, command, options] = getSignedUrlMock.mock.calls[0];
    expect(options.expiresIn).toBe(1200);
    expect(command.input).toMatchObject({
      Bucket: "test-collection",
      Key: "lesson-v1-007.mp3",
      ContentType: "audio/mpeg",
      Metadata: { volume: "1", lesson_number: "7" },
    });
  });
});
