// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { LessonCard } from "@/features/lessons/LessonCard";
import type { Lesson } from "@/types/lesson";

const mockLesson: Lesson = {
  id: 42,
  volume: 1,
  lesson_number: 5,
  title_ar: "درس الخامس في الفقه",
  chapter: { kitab: "كتاب الطهارة", bab: "باب الوضوء", fasl: null },
  duration_seconds: 1325,
  upload_date: "2026-01-05",
  archive_url: "https://archive.org/download/.../lesson42.mp3",
  telegram_post_id: 100,
};

describe("LessonCard", () => {
  it("renders lesson title and number", () => {
    render(<LessonCard lesson={mockLesson} />);

    const title = screen.getByText("درس الخامس في الفقه");
    expect(title).toBeInTheDocument();
    expect(screen.getByText("الدرس 5")).toBeInTheDocument();
  });

  it("displays chapter info (kitab and bab)", () => {
    render(<LessonCard lesson={mockLesson} />);

    expect(screen.getByText("كتاب الطهارة")).toBeInTheDocument();
    expect(screen.getByText("باب الوضوء")).toBeInTheDocument();
  });

  it("formats duration correctly (1325 seconds = 22:05)", () => {
    render(<LessonCard lesson={mockLesson} />);

    expect(screen.getByText("22:05")).toBeInTheDocument();
  });

  it("displays completed badge when isCompleted is true", () => {
    render(<LessonCard lesson={mockLesson} isCompleted={true} />);

    expect(screen.getByText("مُنجَز")).toBeInTheDocument();
  });

  it("does not display completed badge when isCompleted is false", () => {
    render(<LessonCard lesson={mockLesson} isCompleted={false} />);

    expect(screen.queryByText("مُنجَز")).not.toBeInTheDocument();
  });

  it("links to the lesson detail page", () => {
    render(<LessonCard lesson={mockLesson} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/lessons/42");
  });

  it("renders as list item", () => {
    render(
      <ul>
        <LessonCard lesson={mockLesson} />
      </ul>,
    );

    const listItem = screen.getByRole("listitem");
    expect(listItem).toBeInTheDocument();
  });

  it("has proper RTL and language attributes on Arabic text", () => {
    render(<LessonCard lesson={mockLesson} />);

    const arabicTitle = screen.getByText("درس الخامس في الفقه");
    expect(arabicTitle).toHaveAttribute("dir", "rtl");
    expect(arabicTitle).toHaveAttribute("lang", "ar");
  });
});
