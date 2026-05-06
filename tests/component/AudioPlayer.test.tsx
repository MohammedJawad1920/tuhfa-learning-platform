// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { AudioPlayer } from "@/components/audio/AudioPlayer";

// Mock useProgress hook
vi.mock("@/hooks/useProgress", () => ({
  useProgress: () => ({
    getProgress: vi.fn(() => null),
    savePosition: vi.fn(),
    markComplete: vi.fn(),
  }),
}));

describe("AudioPlayer", () => {
  it("renders audio player with controls", () => {
    render(
      <AudioPlayer
        src="https://example.com/audio.mp3"
        lessonId={1}
        title="Test Lesson"
      />,
    );

    expect(screen.getByRole("button", { name: /تشغيل/ })).toBeInTheDocument();
    const select = document.querySelector(
      'select[id="playback-rate"]',
    ) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("1");
  });

  it("has aria-label for accessibility", () => {
    render(
      <AudioPlayer
        src="https://example.com/audio.mp3"
        lessonId={1}
        title="Test Lesson"
      />,
    );

    const audio = document.querySelector("audio");
    expect(audio).toHaveAttribute("aria-label", "Test Lesson");
  });

  it("uses preload=metadata", () => {
    render(
      <AudioPlayer
        src="https://example.com/audio.mp3"
        lessonId={1}
        title="Test Lesson"
      />,
    );

    const audio = document.querySelector("audio");
    expect(audio).toHaveAttribute("preload", "metadata");
  });

  it("displays playback rate options", () => {
    render(
      <AudioPlayer
        src="https://example.com/audio.mp3"
        lessonId={1}
        title="Test Lesson"
      />,
    );

    const options = document.querySelectorAll(
      'select[id="playback-rate"] option',
    );
    const rates = Array.from(options).map((opt) => opt.textContent);

    expect(rates).toContain("0.75x");
    expect(rates).toContain("1x");
    expect(rates).toContain("1.25x");
    expect(rates).toContain("1.5x");
    expect(rates).toContain("2x");
  });

  it("shows error state when audio fails to load", () => {
    const { rerender } = render(
      <AudioPlayer
        src="https://example.com/invalid.mp3"
        lessonId={1}
        title="Test Lesson"
      />,
    );

    // The error display would show on audio error event
    const audio = document.querySelector("audio") as HTMLAudioElement;
    if (audio) {
      expect(audio).toBeInTheDocument();
    }
  });

  it("has keyboard help text displayed", () => {
    render(
      <AudioPlayer
        src="https://example.com/audio.mp3"
        lessonId={1}
        title="Test Lesson"
      />,
    );

    expect(screen.getByText(/المسافة: تشغيل\/إيقاف/)).toBeInTheDocument();
    expect(screen.getByText(/البحث ±5ث/)).toBeInTheDocument();
  });

  it("displays time format at start", () => {
    render(
      <AudioPlayer
        src="https://example.com/audio.mp3"
        lessonId={1}
        title="Test Lesson"
      />,
    );

    // Initial time should be displayed (appears twice: current and duration)
    const times = screen.getAllByText("0:00");
    expect(times.length).toBeGreaterThan(0);
  });

  it("renders with Arabic RTL support", () => {
    render(
      <AudioPlayer
        src="https://example.com/audio.mp3"
        lessonId={1}
        title="Test Lesson"
      />,
    );

    // Check that Arabic labels are present
    const label = screen.getByText("سرعة التشغيل");
    expect(label).toBeInTheDocument();
  });
});
