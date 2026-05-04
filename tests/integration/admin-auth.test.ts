import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const envMock = vi.hoisted(() => ({
  ADMIN_PASSWORD: "correct-password-16chars",
  SESSION_SECRET: "session-secret-must-be-32-chars-min",
  NODE_ENV: "development",
}));

vi.mock("@/config/env", () => ({
  env: envMock,
}));

const checkAuthRateLimitMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rate-limit", () => ({
  checkAuthRateLimit: checkAuthRateLimitMock,
}));

const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: loggerMock,
}));

import { POST } from "@/app/api/v1/admin/auth/route";

describe("POST /api/v1/admin/auth (integration)", () => {
  beforeEach(() => {
    envMock.ADMIN_PASSWORD = "correct-password-16chars";
    envMock.SESSION_SECRET = "session-secret-must-be-32-chars-min";
    checkAuthRateLimitMock.mockReset();
    checkAuthRateLimitMock.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 15 * 60 * 1000,
    });
    loggerMock.info.mockReset();
    loggerMock.warn.mockReset();
  });

  it("returns 200 with Set-Cookie on correct password", async () => {
    const request = new NextRequest("http://localhost/api/v1/admin/auth", {
      method: "POST",
      body: JSON.stringify({ password: "correct-password-16chars" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("tuhfa_session=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Strict");

    const body = await response.json();
    expect(body.data.authenticated).toBe(true);
  });

  it("returns 401 without Set-Cookie on wrong password", async () => {
    const request = new NextRequest("http://localhost/api/v1/admin/auth", {
      method: "POST",
      body: JSON.stringify({ password: "wrong-password" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toBeFalsy();
  });

  it("returns 429 on rate limit without cookie", async () => {
    checkAuthRateLimitMock.mockResolvedValueOnce({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 60 * 1000,
    });

    const request = new NextRequest("http://localhost/api/v1/admin/auth", {
      method: "POST",
      body: JSON.stringify({ password: "correct-password-16chars" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(429);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toBeFalsy();
  });

  it("session cookie respects HttpOnly and SameSite flags", async () => {
    const request = new NextRequest("http://localhost/api/v1/admin/auth", {
      method: "POST",
      body: JSON.stringify({ password: "correct-password-16chars" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie");
    // Verify critical security flags are applied per session config
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Strict");
  });
});
