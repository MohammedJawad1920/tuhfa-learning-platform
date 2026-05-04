import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const fetchLessonsMock = vi.fn();

vi.mock("@/lib/github", async () => {
  class UpstreamError extends Error {}

  return {
    fetchLessons: fetchLessonsMock,
    UpstreamError,
  };
});

import { GET } from "@/app/api/v1/lessons/route";

describe("lessons route", () => {
  beforeEach(() => {
    fetchLessonsMock.mockReset();
  });

  it("returns lessons from GitHub", async () => {
    fetchLessonsMock.mockResolvedValue({
      data: {
        version: 1,
        last_updated: "2026-05-03T00:00:00.000Z",
        lessons: [{ id: 1, title_ar: "درس" }],
      },
      sha: "abc123",
    });

    const request = new NextRequest("http://localhost/api/v1/lessons?limit=1");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.data.lessons).toEqual([{ id: 1, title_ar: "درس" }]);
    expect(typeof body.meta.requestId).toBe("string");
    expect(typeof body.meta.timestamp).toBe("string");
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=60, stale-while-revalidate=300",
    );
    expect(fetchLessonsMock).toHaveBeenCalledTimes(1);
  });

  it("returns 502 when GitHub is unavailable", async () => {
    const { UpstreamError } = await import("@/lib/github");
    fetchLessonsMock.mockRejectedValue(new UpstreamError("boom"));

    const request = new NextRequest("http://localhost/api/v1/lessons");
    const response = await GET(request);

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error.code).toBe("UPSTREAM_ERROR");
    expect(body.error.message).toContain("GitHub");
  });
});
