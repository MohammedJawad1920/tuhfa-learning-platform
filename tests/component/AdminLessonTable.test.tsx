// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AdminLessonTable } from "@/components/admin/AdminLessonTable";
import { formatDate } from "@/lib/format";
import type { Lesson } from "@/types/lesson";

const lessons: Lesson[] = [
  {
    id: 1,
    volume: 1,
    lesson_number: 12,
    title_ar: "درس الطهارة",
    chapter: { kitab: "كتاب الطهارة", bab: "باب الماء", fasl: null },
    duration_seconds: 3720,
    upload_date: "2026-04-01",
    archive_url: "https://archive.org/download/example/lesson-v1-012.mp3",
    telegram_post_id: 99,
  },
  {
    id: 2,
    volume: 2,
    lesson_number: 5,
    title_ar: "درس الصلاة",
    chapter: { kitab: "كتاب الصلاة", bab: null, fasl: null },
    duration_seconds: 180,
    upload_date: "2026-04-02",
    archive_url: "https://archive.org/download/example/lesson-v2-005.mp3",
    telegram_post_id: 100,
  },
];

describe("AdminLessonTable", () => {
  it("renders lesson rows and table headers", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <AdminLessonTable
        lessons={lessons}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    expect(
      screen.getByRole("table", { name: "قائمة الدروس الإدارية" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "المجلد" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "الإجراءات" }),
    ).toBeInTheDocument();
    expect(screen.getByText("درس الطهارة")).toBeInTheDocument();
    expect(screen.getByText("كتاب الطهارة")).toBeInTheDocument();
    expect(screen.getByText("1:02:00")).toBeInTheDocument();
    expect(screen.getByText(formatDate("2026-04-01"))).toBeInTheDocument();
  });

  it("calls edit and delete handlers", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <AdminLessonTable
        lessons={lessons}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole("button", { name: "تعديل الدرس 1" }));
    await user.click(screen.getByRole("button", { name: "حذف الدرس 2" }));

    expect(onEdit).toHaveBeenCalledWith(1);
    expect(onDelete).toHaveBeenCalledWith(2);
  });
});
