import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_API_BASE_URL: "http://localhost:3000/api/v1",
  NODE_ENV: "development",
  ADMIN_PASSWORD: "correct-horse-battery-staple",
  SESSION_SECRET: "0123456789abcdef0123456789abcdef",
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
  REVALIDATION_SECRET: "0123456789abcdef0123456789abcdef",
  NEXT_PUBLIC_VERCEL_ANALYTICS_ID: "",
}));

vi.mock("@/config/env", () => ({
  env: envMock,
}));

const getIronSessionMock = vi.hoisted(() => vi.fn());

vi.mock("iron-session", () => ({
  getIronSession: getIronSessionMock,
}));

const { proxy } = await import("@/proxy");

describe("proxy", () => {
  beforeEach(() => {
    getIronSessionMock.mockReset();
  });

  it("redirects unauthenticated admin routes to /admin/login", async () => {
    const request = new NextRequest("http://localhost/admin");

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/admin/login",
    );
  });

  it("allows /admin/login through without redirect", async () => {
    const request = new NextRequest("http://localhost/admin/login");

    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it("redirects POST /admin/login back to GET /admin/login", async () => {
    const request = new NextRequest("http://localhost/admin/login", {
      method: "POST",
    });

    const response = await proxy(request);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://localhost/admin/login",
    );
  });

  it("returns 401 JSON for unauthenticated admin API routes", async () => {
    getIronSessionMock.mockResolvedValue({
      authenticated: false,
      createdAt: undefined,
      save: vi.fn(),
      destroy: vi.fn(),
      updateConfig: vi.fn(),
    });

    const request = new NextRequest("http://localhost/api/v1/admin/lessons", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });

    const response = await proxy(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("allows /api/v1/admin/auth through without requiring session", async () => {
    const request = new NextRequest("http://localhost/api/v1/admin/auth", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });

    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(getIronSessionMock).not.toHaveBeenCalled();
  });

  it("allows authenticated admin API routes through", async () => {
    getIronSessionMock.mockResolvedValue({
      authenticated: true,
      createdAt: Date.now(),
      save: vi.fn(),
      destroy: vi.fn(),
      updateConfig: vi.fn(),
    });

    const request = new NextRequest("http://localhost/api/v1/admin/lessons", {
      headers: { origin: "http://localhost:3000" },
    });

    const response = await proxy(request);

    expect(response.status).toBe(200);
  });
});
