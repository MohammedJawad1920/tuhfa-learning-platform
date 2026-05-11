import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const revalidateTagMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
}));

const envMock = vi.hoisted(() => ({
  REVALIDATION_SECRET: "R".repeat(32),
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_API_BASE_URL: "http://localhost:4010",
  NODE_ENV: "development",
  ADMIN_PASSWORD: "A".repeat(16),
  SESSION_SECRET: "S".repeat(32),
  SESSION_MAX_AGE_SECONDS: 86400,
  GITHUB_TOKEN: "token",
  GITHUB_REPO_OWNER: "owner",
  GITHUB_REPO_NAME: "repo",
  GITHUB_FILE_PATH: "data/lessons.json",
  GITHUB_BRANCH: "main",
  IA_ACCESS_KEY: "access",
  IA_SECRET_KEY: "secret",
  IA_COLLECTION_IDENTIFIER: "collection",
  IA_S3_ENDPOINT: "https://s3.us.archive.org",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "token",
  NEXT_PUBLIC_VERCEL_ANALYTICS_ID: "",
}));

vi.mock("@/config/env", () => ({
  env: envMock,
}));

import { GET, POST } from "@/app/api/revalidate/route";

describe("revalidate route", () => {
  beforeEach(() => {
    revalidateTagMock.mockReset();
  });

  it("returns 405 for GET", async () => {
    const response = await GET();
    expect(response.status).toBe(405);
  });

  it("returns 401 without authorization header", async () => {
    const request = new NextRequest("http://localhost/api/revalidate", {
      method: "POST",
      headers: { "x-revalidate-nonce": Date.now().toString() },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("returns 401 with stale nonce", async () => {
    const request = new NextRequest("http://localhost/api/revalidate", {
      method: "POST",
      headers: {
        authorization: `Bearer ${envMock.REVALIDATION_SECRET}`,
        "x-revalidate-nonce": (Date.now() - 61_000).toString(),
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("returns 200 and revalidates lessons on valid POST", async () => {
    const request = new NextRequest("http://localhost/api/revalidate", {
      method: "POST",
      headers: {
        authorization: `Bearer ${envMock.REVALIDATION_SECRET}`,
        "x-revalidate-nonce": Date.now().toString(),
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(revalidateTagMock).toHaveBeenCalledWith("lessons");
  });
});
