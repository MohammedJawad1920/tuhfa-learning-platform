// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LessonDetail } from "@/features/lessons/LessonDetail";
import type { Lesson } from "@/types/lesson";

const getLessonByIdMock = vi.fn();

let progressStore: Record<
  number,
  { completed: boolean; positionSeconds: number; lastPlayedAt: string }
> = {};

vi.mock("@/api/endpoints", () => ({
  getLessonById: (...args: unknown[]) => getLessonByIdMock(...args),
}));

vi.mock("@/hooks/useProgress", () => ({
  useProgress: () => ({
    getProgress: (lessonId: number) => progressStore[lessonId] ?? null,
    savePosition: vi.fn(),
    markComplete: (lessonId: number) => {
      progressStore[lessonId] = {
        completed: true,
        positionSeconds: progressStore[lessonId]?.positionSeconds ?? 0,
        lastPlayedAt: new Date().toISOString(),
      };
    },
  }),
}));

vi.mock("@/components/audio/AudioPlayer", () => ({
  AudioPlayer: ({ src }: { src: string; title: string }) => (
    <div data-testid="audio-player">
      <span>{src}</span>
    </div>
  ),
}));

const lesson: Lesson = {
  id: 1,
  volume: 1,
  lesson_number: 12,
  title_ar: "درس الاختبار",
  chapter: { kitab: "كتاب الطهارة", bab: "باب الماء", fasl: null },
  duration_seconds: 3720,
  upload_date: "2026-04-01",
  archive_url: "https://archive.org/download/example/lesson-v1-012.mp3",
  telegram_post_id: 99,
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("LessonDetail", () => {
  beforeEach(() => {
    getLessonByIdMock.mockReset();
    progressStore = {};
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders lesson metadata and audio section", async () => {
    getLessonByIdMock.mockResolvedValueOnce({ data: { lesson } });

    renderWithClient(<LessonDetail lessonId={1} />);

    await waitFor(() => {
      expect(screen.getByText("درس الاختبار")).toBeInTheDocument();
    });

    expect(screen.getByText(/Lesson 12/)).toBeInTheDocument();
    expect(screen.getByText(/Volume 1/)).toBeInTheDocument();
    expect(screen.getByText("Duration:")).toBeInTheDocument();
    expect(screen.getByText("Upload date:")).toBeInTheDocument();
    expect(screen.getByTestId("audio-player")).toBeInTheDocument();
  });

  it("shows English not-found state when lesson lookup fails", async () => {
    getLessonByIdMock.mockRejectedValueOnce(new Error("Not found"));

    renderWithClient(<LessonDetail lessonId={99999} />);

    await waitFor(() => {
      expect(screen.getByText("Lesson not found")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: "Back to lessons" }),
    ).toBeInTheDocument();
  });

  it("updates completion badge after marking complete", async () => {
    const user = userEvent.setup();
    getLessonByIdMock.mockResolvedValueOnce({ data: { lesson } });

    renderWithClient(<LessonDetail lessonId={1} />);

    await waitFor(() => {
      expect(screen.getByText("درس الاختبار")).toBeInTheDocument();
    });

    expect(screen.queryByText(/^مُنجَز$/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "وضّح كمُنجَز" }));

    await waitFor(() => {
      expect(screen.getByText(/^مُنجَز$/)).toBeInTheDocument();
    });
  });
});
