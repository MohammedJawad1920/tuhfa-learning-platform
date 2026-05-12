// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AudioPlayer } from "@/components/audio/AudioPlayer";

const getProgressMock = vi.fn();
const savePositionMock = vi.fn();
const markCompleteMock = vi.fn();

vi.mock("@/hooks/useProgress", () => ({
  useProgress: () => ({
    getProgress: getProgressMock,
    savePosition: savePositionMock,
    markComplete: markCompleteMock,
  }),
}));

describe("AudioPlayer", () => {
  beforeEach(() => {
    getProgressMock.mockReset();
    savePositionMock.mockReset();
    markCompleteMock.mockReset();

    getProgressMock.mockReturnValue(null);

    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(
      function playMock(this: HTMLMediaElement) {
        Object.defineProperty(this, "paused", {
          configurable: true,
          get: () => false,
        });
        return Promise.resolve();
      },
    );
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(
      function pauseMock(this: HTMLMediaElement) {
        Object.defineProperty(this, "paused", {
          configurable: true,
          get: () => true,
        });
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("restores saved playback position on mount", async () => {
    getProgressMock.mockReturnValue({
      completed: false,
      positionSeconds: 42,
      lastPlayedAt: new Date().toISOString(),
    });

    const { container } = render(
      <AudioPlayer
        src="https://example.com/audio.mp3"
        lessonId={5}
        title="Test Lesson"
      />,
    );

    const audio = container.querySelector("audio") as HTMLAudioElement;

    await waitFor(() => {
      expect(audio.currentTime).toBe(42);
    });
  });

  it("plays and pauses when clicking the control button", async () => {
    const user = userEvent.setup();

    render(
      <AudioPlayer
        src="https://example.com/audio.mp3"
        lessonId={1}
        title="Test Lesson"
      />,
    );

    const playButton = screen.getByRole("button", { name: "تشغيل" });
    await user.click(playButton);

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "إيقاف التشغيل" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "إيقاف التشغيل" }));
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1);
  });

  it("seeks forward and backward with keyboard arrows", () => {
    const { container } = render(
      <AudioPlayer
        src="https://example.com/audio.mp3"
        lessonId={1}
        title="Test Lesson"
      />,
    );

    const audio = container.querySelector("audio") as HTMLAudioElement;

    Object.defineProperty(audio, "duration", {
      configurable: true,
      writable: true,
      value: 60,
    });
    Object.defineProperty(audio, "currentTime", {
      configurable: true,
      writable: true,
      value: 10,
    });

    fireEvent.keyDown(audio, { code: "ArrowRight" });
    expect(audio.currentTime).toBe(15);

    fireEvent.keyDown(audio, { code: "ArrowLeft" });
    expect(audio.currentTime).toBe(10);
  });

  it("saves playback progress on timeupdate", () => {
    const { container } = render(
      <AudioPlayer
        src="https://example.com/audio.mp3"
        lessonId={7}
        title="Test Lesson"
      />,
    );

    const audio = container.querySelector("audio") as HTMLAudioElement;
    Object.defineProperty(audio, "currentTime", {
      configurable: true,
      writable: true,
      value: 23,
    });

    fireEvent.timeUpdate(audio);

    expect(savePositionMock).toHaveBeenCalledWith(7, 23);
  });

  it("shows the required English message when audio fails", () => {
    const { container } = render(
      <AudioPlayer
        src="https://example.com/invalid.mp3"
        lessonId={1}
        title="Test Lesson"
      />,
    );

    const audio = container.querySelector("audio") as HTMLAudioElement;
    fireEvent.error(audio);

    expect(
      screen.getByText(
        "Audio could not be loaded - Internet Archive may be temporarily unavailable.",
      ),
    ).toBeInTheDocument();
  });
});
