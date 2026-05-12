// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LessonBrowser } from "@/features/lessons/LessonBrowser";

const allLessons = [
  {
    id: 1,
    volume: 1,
    lesson_number: 1,
    title_ar: "درس الأول",
    chapter: { kitab: "كتاب الطهارة", bab: "باب الماء", fasl: null },
    duration_seconds: 300,
    upload_date: "2026-01-01",
    archive_url: "https://archive.org/download/example/1.mp3",
    telegram_post_id: 1,
  },
];

const filteredLessons = {
  lessons: allLessons,
  total: 120,
};

const useAllLessonsMock = vi.fn(() => ({
  data: allLessons,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
}));

const useFilteredLessonsMock = vi.fn(
  (_filters?: unknown, _page?: unknown, _limit?: unknown) => ({
    data: filteredLessons,
    isLoading: false,
    isError: false,
  }),
);

vi.mock("@/hooks/useLessons", () => ({
  useAllLessons: () => useAllLessonsMock(),
  useFilteredLessons: (filters?: unknown, page?: unknown, limit?: unknown) =>
    useFilteredLessonsMock(filters, page, limit),
}));

describe("LessonBrowser", () => {
  beforeEach(() => {
    useAllLessonsMock.mockClear();
    useFilteredLessonsMock.mockClear();
  });

  it("renders lessons and computes total pages from meta.total", () => {
    render(<LessonBrowser />);

    expect(screen.getByText("120 lessons")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("درس الأول")).toBeInTheDocument();
  });

  it("blocks one-character search terms from reaching the hook", async () => {
    const user = userEvent.setup();
    render(<LessonBrowser />);

    await user.type(screen.getByLabelText("Search lessons"), "a");

    const lastCall = useFilteredLessonsMock.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    if (!lastCall) {
      throw new Error("Expected useFilteredLessons to be called");
    }
    expect(lastCall[0]).toMatchObject({ search: undefined });
  });
});
