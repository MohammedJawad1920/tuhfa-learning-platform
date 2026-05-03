import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  // Ensure required env variables exist for the module under test
  process.env.GITHUB_TOKEN = "test-token";
  process.env.GITHUB_REPO_OWNER = "owner";
  process.env.GITHUB_REPO_NAME = "repo";
  process.env.GITHUB_FILE_PATH = "data/lessons.json";
  process.env.GITHUB_BRANCH = "main";
  // Minimal env values required by src/config/env.ts
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4010";
  process.env.NODE_ENV = "test";
  process.env.ADMIN_PASSWORD = "A".repeat(16);
  process.env.SESSION_SECRET = "S".repeat(32);
  process.env.SESSION_MAX_AGE_SECONDS = "86400";
  process.env.IA_ACCESS_KEY = "ia";
  process.env.IA_SECRET_KEY = "ia";
  process.env.IA_COLLECTION_IDENTIFIER = "col";
  process.env.IA_S3_ENDPOINT = "https://s3.example.org";
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";
  process.env.ALLOWED_ORIGINS = "*";
  process.env.REVALIDATION_SECRET = "R".repeat(32);
});

describe("github client", () => {
  it("fetchLessons returns parsed data and sha", async () => {
    const contentObj = {
      version: 1,
      last_updated: "2026-05-03T00:00:00Z",
      lessons: [],
    };
    const base64 = Buffer.from(JSON.stringify(contentObj), "utf8").toString(
      "base64",
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: base64, sha: "abc123" }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const mod = await import("@/lib/github");

    const { data, sha } = await mod.fetchLessons();

    expect(sha).toBe("abc123");
    expect(data).toEqual(contentObj);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("updateLessons PUTs encoded content and returns json", async () => {
    const lessons = {
      version: 1,
      last_updated: "2026-05-03T00:00:00Z",
      lessons: [{ id: 1 }],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ commit: { sha: "newsha" } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const mod = await import("@/lib/github");

    const res = await mod.updateLessons(lessons, "oldsha", "commit-msg");

    expect(res).toEqual({ commit: { sha: "newsha" } });
    expect(fetchMock).toHaveBeenCalled();

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/repos/owner/repo/contents/");
    expect(options.method).toBe("PUT");
    const body = JSON.parse(String(options.body));
    expect(body.message).toBe("commit-msg");
    expect(body.sha).toBe("oldsha");
    expect(typeof body.content).toBe("string");
  });

  it("updateLessons throws ConflictError on 409", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 409,
        text: async () => "conflict",
      });
    vi.stubGlobal("fetch", fetchMock);

    const mod = await import("@/lib/github");

    await expect(mod.updateLessons({}, "some-sha", "m")).rejects.toBeInstanceOf(
      mod.ConflictError,
    );
  });
});
