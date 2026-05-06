import { describe, expect, it } from "vitest";

import { formatDate, formatDuration } from "@/lib/format";

describe("format helpers", () => {
  it("formats durations under an hour as MM:SS", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(65)).toBe("01:05");
    expect(formatDuration(3599)).toBe("59:59");
  });

  it("formats durations at an hour or above as H:MM:SS", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3661)).toBe("1:01:01");
  });

  it("formats YYYY-MM-DD dates using Arabic locale output", () => {
    expect(formatDate("2026-04-30")).toBe("٣٠ أبريل ٢٠٢٦");
  });

  it("returns the original string for invalid dates", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});