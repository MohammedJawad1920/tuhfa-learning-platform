// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChapterNav } from "@/features/lessons/ChapterNav";
import type { Lesson } from "@/types/lesson";

const mockLessons: Lesson[] = [
  {
    id: 1,
    volume: 1,
    lesson_number: 1,
    title_ar: "درس الأول",
    chapter: { kitab: "الكتاب الأول", bab: "الباب الأول", fasl: null },
    duration_seconds: 300,
    upload_date: "2026-01-01",
    archive_url: "https://archive.org/download/...",
    telegram_post_id: 1,
  },
  {
    id: 2,
    volume: 1,
    lesson_number: 2,
    title_ar: "درس الثاني",
    chapter: { kitab: "الكتاب الأول", bab: "الباب الثاني", fasl: null },
    duration_seconds: 300,
    upload_date: "2026-01-02",
    archive_url: "https://archive.org/download/...",
    telegram_post_id: 2,
  },
  {
    id: 3,
    volume: 2,
    lesson_number: 1,
    title_ar: "درس الثالث",
    chapter: { kitab: "الكتاب الثاني", bab: "الباب الأول", fasl: null },
    duration_seconds: 300,
    upload_date: "2026-01-03",
    archive_url: "https://archive.org/download/...",
    telegram_post_id: 3,
  },
];

describe("ChapterNav", () => {
  it("renders volume buttons", () => {
    const onFilterChange = vi.fn();
    render(
      <ChapterNav lessons={mockLessons} onFilterChange={onFilterChange} />,
    );

    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
  });

  it("shows kitab options when volume is selected", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <ChapterNav lessons={mockLessons} onFilterChange={onFilterChange} />,
    );

    const vol1Button = screen.getByRole("button", { name: "1" });
    await user.click(vol1Button);

    const kitabSelect = screen.getByDisplayValue("اختر كتاباً");
    expect(kitabSelect).toBeInTheDocument();

    // Open the select and check options
    await user.click(kitabSelect);
    const option = screen.getByRole("option", { name: "الكتاب الأول" });
    expect(option).toBeInTheDocument();
  });

  it("cascades bab options from selected kitab", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <ChapterNav lessons={mockLessons} onFilterChange={onFilterChange} />,
    );

    // Select volume 1
    await user.click(screen.getByRole("button", { name: "1" }));

    // Select kitab
    const kitabSelect = screen.getByDisplayValue("اختر كتاباً");
    await user.selectOptions(kitabSelect, "الكتاب الأول");

    // Bab select should appear
    const babSelect = screen.getByDisplayValue("اختر باباً");
    expect(babSelect).toBeInTheDocument();

    // Bab options should be filtered
    await user.click(babSelect);
    expect(
      screen.getByRole("option", { name: "الباب الأول" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "الباب الثاني" }),
    ).toBeInTheDocument();
  });

  it("calls onFilterChange when volume is selected", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <ChapterNav lessons={mockLessons} onFilterChange={onFilterChange} />,
    );

    await user.click(screen.getByRole("button", { name: "1" }));

    expect(onFilterChange).toHaveBeenCalledWith({ volume: 1 });
  });

  it("calls onFilterChange with kitab when kitab is selected", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <ChapterNav lessons={mockLessons} onFilterChange={onFilterChange} />,
    );

    await user.click(screen.getByRole("button", { name: "1" }));
    onFilterChange.mockClear();

    const kitabSelect = screen.getByDisplayValue("اختر كتاباً");
    await user.selectOptions(kitabSelect, "الكتاب الأول");

    expect(onFilterChange).toHaveBeenCalledWith({
      volume: 1,
      kitab: "الكتاب الأول",
    });
  });

  it("resets all filters when reset button is clicked", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <ChapterNav lessons={mockLessons} onFilterChange={onFilterChange} />,
    );

    // Select filters
    await user.click(screen.getByRole("button", { name: "1" }));
    const kitabSelect = screen.getByDisplayValue("اختر كتاباً");
    await user.selectOptions(kitabSelect, "الكتاب الأول");

    onFilterChange.mockClear();

    // Click reset
    const resetButton = screen.getByRole("button", { name: "إعادة تعيين" });
    await user.click(resetButton);

    expect(onFilterChange).toHaveBeenCalledWith({});
  });
});
