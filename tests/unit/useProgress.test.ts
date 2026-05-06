// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useProgress } from "@/hooks/useProgress";

describe("useProgress", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null for unknown lesson id", () => {
    const { result } = renderHook(() => useProgress());
    const progress = result.current.getProgress(999);
    expect(progress).toBeNull();
  });

  it("saves position with correct shape", () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.savePosition(1, 123.5);
    });

    const progress = result.current.getProgress(1);
    expect(progress).not.toBeNull();
    expect(progress?.positionSeconds).toBe(123.5);
    expect(progress?.completed).toBe(false);
    expect(progress?.lastPlayedAt).toMatch(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    );
  });

  it("marks lesson complete", () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.savePosition(1, 100);
    });

    act(() => {
      result.current.markComplete(1);
    });

    const progress = result.current.getProgress(1);
    expect(progress?.completed).toBe(true);
  });

  it("throttles savePosition to 5s intervals", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useProgress());

    // Save at t=0
    act(() => {
      result.current.savePosition(1, 100);
    });

    let progress = result.current.getProgress(1);
    expect(progress?.positionSeconds).toBe(100);

    // Try to save at t=2s (should be throttled)
    vi.advanceTimersByTime(2000);
    act(() => {
      result.current.savePosition(1, 150);
    });

    progress = result.current.getProgress(1);
    expect(progress?.positionSeconds).toBe(100); // Should not update

    // Try to save at t=5s (should succeed)
    vi.advanceTimersByTime(3000);
    act(() => {
      result.current.savePosition(1, 200);
    });

    progress = result.current.getProgress(1);
    expect(progress?.positionSeconds).toBe(200); // Should update

    vi.useRealTimers();
  });

  it("handles multiple lessons independently", () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.savePosition(1, 100);
      result.current.savePosition(2, 200);
    });

    expect(result.current.getProgress(1)?.positionSeconds).toBe(100);
    expect(result.current.getProgress(2)?.positionSeconds).toBe(200);
  });

  it("gracefully handles localStorage unavailable", () => {
    const { result } = renderHook(() => useProgress());

    const spy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("localStorage unavailable");
      });

    // Should not throw
    expect(() => {
      act(() => {
        result.current.savePosition(1, 100);
      });
    }).not.toThrow();

    spy.mockRestore();
  });

  it("returns null when parsing JSON fails", () => {
    localStorage.setItem("tuhfa_progress", "invalid json");

    const { result } = renderHook(() => useProgress());
    const progress = result.current.getProgress(1);
    expect(progress).toBeNull();
  });

  it("preserves other lessons when updating one", () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.savePosition(1, 100);
      result.current.savePosition(2, 200);
    });

    vi.useFakeTimers();
    vi.advanceTimersByTime(5000);

    act(() => {
      result.current.savePosition(1, 150);
    });

    vi.useRealTimers();

    expect(result.current.getProgress(1)?.positionSeconds).toBe(150);
    expect(result.current.getProgress(2)?.positionSeconds).toBe(200);
  });
});
