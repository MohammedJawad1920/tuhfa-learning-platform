import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const callCounts = new Map<string, number>();

class MockRatelimit {
  limiter: { requests: number; window: string };
  prefix: string;

  constructor(options: {
    limiter: { requests: number; window: string };
    prefix: string;
  }) {
    this.limiter = options.limiter;
    this.prefix = options.prefix;
  }

  static slidingWindow(requests: number, window: string) {
    return { requests, window };
  }

  async limit(identifier: string) {
    const key = `${this.prefix}:${identifier}`;
    const current = callCounts.get(key) ?? 0;
    const next = current + 1;
    callCounts.set(key, next);

    const allowed = next <= this.limiter.requests;
    const remaining = Math.max(this.limiter.requests - next, 0);

    return {
      success: allowed,
      limit: this.limiter.requests,
      remaining,
      reset: Date.now() + 60_000,
    };
  }
}

vi.mock("@upstash/redis", () => ({
  Redis: class Redis {},
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: MockRatelimit,
}));

describe("rate-limit helpers", () => {
  beforeEach(() => {
    callCounts.clear();
    vi.resetModules();
    const mergedEnv = { ...process.env, ...validEnv } as NodeJS.ProcessEnv;
    process.env = mergedEnv;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("public rate limit allows 120 requests and blocks the 121st", async () => {
    const rateLimit = await import("../../src/lib/rate-limit");

    let result = { success: true, limit: 0, remaining: 0, reset: 0 };

    for (let attempt = 1; attempt <= 121; attempt++) {
      result = await rateLimit.checkPublicRateLimit({
        "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      });

      if (attempt <= 120) {
        expect(result.success).toBe(true);
      }
    }

    expect(result.success).toBe(false);
    expect(result.limit).toBe(120);
    expect(result.remaining).toBe(0);
  });

  it("auth rate limit blocks the 6th attempt within the window", async () => {
    const rateLimit = await import("../../src/lib/rate-limit");

    let result = { success: true, limit: 0, remaining: 0, reset: 0 };

    for (let attempt = 1; attempt <= 6; attempt++) {
      result = await rateLimit.checkAuthRateLimit({
        "x-forwarded-for": "198.51.100.22",
      });

      if (attempt <= 5) {
        expect(result.success).toBe(true);
      }
    }

    expect(result.success).toBe(false);
    expect(result.limit).toBe(5);
    expect(result.remaining).toBe(0);
  });

  it("extracts the client IP from the first x-forwarded-for entry", async () => {
    const rateLimit = await import("../../src/lib/rate-limit");

    const result = await rateLimit.checkPublicRateLimit({
      "x-forwarded-for": "192.0.2.5, 10.0.0.1, 127.0.0.1",
    });

    expect(result.success).toBe(true);
    expect(
      rateLimit.getClientIp({ "x-forwarded-for": "192.0.2.5, 10.0.0.1" }),
    ).toBe("192.0.2.5");
  });
});
