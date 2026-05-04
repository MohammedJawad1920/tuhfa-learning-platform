import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
  ADMIN_PASSWORD: "correct-horse-battery-staple",
}));

vi.mock("@/config/env", () => ({
  env: envMock,
}));

import { POST } from "@/app/api/v1/admin/auth/route";

describe("POST /api/v1/admin/auth", () => {
  beforeEach(() => {
    envMock.ADMIN_PASSWORD = "correct-horse-battery-staple";
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
});
