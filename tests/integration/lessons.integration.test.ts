import { describe, it, expect } from "vitest";

describe("Integration: /api/v1/lessons", () => {
  it("returns lessons list from mock server", async () => {
    const res = await fetch("http://127.0.0.1:4010/api/v1/lessons");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body.data).toHaveProperty("lessons");
    expect(Array.isArray(body.data.lessons)).toBe(true);
    expect(body).toHaveProperty("meta");
    expect(body.meta).toHaveProperty("requestId");
  });
});
