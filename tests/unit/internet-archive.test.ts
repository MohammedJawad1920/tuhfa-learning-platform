import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Readable } from "stream";

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
  process.env.ALLOWED_ORIGINS = "*";
  process.env.REVALIDATION_SECRET = "R".repeat(32);
});

describe("internet-archive client", () => {
  it("generateIAFilename produces correct format", async () => {
    const mod = await import("@/lib/internet-archive");

    expect(mod.generateIAFilename(1, 214)).toBe("lesson-v1-214.mp3");
    expect(mod.generateIAFilename(2, 5)).toBe("lesson-v2-005.mp3");
    expect(mod.generateIAFilename(4, 111)).toBe("lesson-v4-111.mp3");
  });

  it("uploadToIA calls S3Client.send with correct Bucket and Key", async () => {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

    const mockSend = vi.fn().mockResolvedValue({});
    vi.spyOn(S3Client.prototype, "send").mockImplementation(mockSend);

    const mod = await import("@/lib/internet-archive");

    const fileContent = Buffer.from("fake audio content");
    const fileStream = Readable.from([fileContent]);

    const result = await mod.uploadToIA(fileStream, 1, 214, "audio/mpeg", {
      volume: 1,
      lesson_number: 214,
    });

    // Verify filename generation
    expect(result.filename).toBe("lesson-v1-214.mp3");

    // Verify archive URL
    expect(result.archive_url).toBe(
      "https://archive.org/download/test-collection/lesson-v1-214.mp3",
    );

    // Verify size
    expect(result.size_bytes).toBe(fileContent.length);

    // Verify send was called
    expect(mockSend).toHaveBeenCalled();

    // Check the command that was sent
    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs).toBeInstanceOf(PutObjectCommand);
    expect(callArgs.input.Bucket).toBe("test-collection");
    expect(callArgs.input.Key).toBe("lesson-v1-214.mp3");
    expect(callArgs.input.ContentType).toBe("audio/mpeg");
  });

  it("uploadToIA throws UploadError on S3 failure", async () => {
    const { S3Client } = await import("@aws-sdk/client-s3");

    const mockError = new Error("S3 connection failed");
    vi.spyOn(S3Client.prototype, "send").mockRejectedValue(mockError);

    const mod = await import("@/lib/internet-archive");

    const fileStream = Readable.from([Buffer.from("content")]);

    await expect(
      mod.uploadToIA(fileStream, 1, 1, "audio/mpeg"),
    ).rejects.toBeInstanceOf(mod.UploadError);
  });

  it("uploadToIA throws UploadError on S3 failure or timeout", async () => {
    const { S3Client } = await import("@aws-sdk/client-s3");

    // Test timeout error message
    const mockError = new Error("Request timeout");
    vi.spyOn(S3Client.prototype, "send").mockRejectedValueOnce(mockError);

    const mod = await import("@/lib/internet-archive");

    const fileStream = Readable.from([Buffer.from("content")]);

    const error = await mod
      .uploadToIA(fileStream, 1, 1, "audio/mpeg")
      .catch((e) => e);

    expect(error).toBeInstanceOf(mod.UploadError);
    expect(error.message).toContain("Failed to upload");
  });

  it("uploadToIA includes metadata in S3 object", async () => {
    const { S3Client } = await import("@aws-sdk/client-s3");

    const mockSend = vi.fn().mockResolvedValue({});
    vi.spyOn(S3Client.prototype, "send").mockImplementation(mockSend);

    const mod = await import("@/lib/internet-archive");

    const fileStream = Readable.from([Buffer.from("content")]);
    const metadata = {
      volume: 2,
      lesson_number: 45,
      title_ar: "درس النحو",
    };

    await mod.uploadToIA(fileStream, 2, 45, "audio/mpeg", metadata);

    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.input.Metadata).toBeDefined();
    expect(callArgs.input.Metadata!.volume).toBe("2");
    expect(callArgs.input.Metadata!.lesson_number).toBe("45");
    expect(callArgs.input.Metadata!.title_ar).toBe("درس النحو");
  });
});
