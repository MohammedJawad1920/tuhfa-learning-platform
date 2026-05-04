import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
  ADMIN_PASSWORD: "correct-horse-battery-staple",
}));

vi.mock("@/config/env", () => ({
  env: envMock,
}));

const checkAuthRateLimitMock = vi.hoisted(() => vi.fn());
const loggerMock = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn() }));

vi.mock("@/lib/rate-limit", () => ({
  checkAuthRateLimit: checkAuthRateLimitMock,
}));

vi.mock("@/lib/logger", () => ({
  logger: loggerMock,
}));

import { POST } from "@/app/api/v1/admin/auth/route";

describe("POST /api/v1/admin/auth", () => {
  beforeEach(() => {
    envMock.ADMIN_PASSWORD = "correct-horse-battery-staple";
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

  it("returns 200 for the correct password", async () => {
    const request = new NextRequest("http://localhost/api/v1/admin/auth", {
      method: "POST",
      body: JSON.stringify({ password: "correct-horse-battery-staple" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual({ authenticated: true });
    expect(typeof body.meta.requestId).toBe("string");
    expect(typeof body.meta.timestamp).toBe("string");
  });

  it("returns 401 for an incorrect password", async () => {
    const request = new NextRequest("http://localhost/api/v1/admin/auth", {
      method: "POST",
      body: JSON.stringify({ password: "wrong-password" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
    expect(body.error.message).toBe("Invalid credentials");
    expect(loggerMock.warn).toHaveBeenCalled();
  });

  it("returns 422 when password is missing", async () => {
    const request = new NextRequest("http://localhost/api/v1/admin/auth", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.password).toContain("Required");
  });

  it("returns 429 when rate limited", async () => {
    checkAuthRateLimitMock.mockResolvedValueOnce({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 60 * 1000,
    });

    const request = new NextRequest("http://localhost/api/v1/admin/auth", {
      method: "POST",
      body: JSON.stringify({ password: "whatever" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(response.headers.get("Retry-After")).toBeTruthy();
  });

  it("logs info on successful auth", async () => {
    const request = new NextRequest("http://localhost/api/v1/admin/auth", {
      method: "POST",
      body: JSON.stringify({ password: "correct-horse-battery-staple" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(loggerMock.info).toHaveBeenCalled();
  });
});
