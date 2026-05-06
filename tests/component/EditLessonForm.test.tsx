// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EditLessonForm } from "@/components/admin/EditLessonForm";
import type { Lesson } from "@/types/lesson";

const replace = vi.fn();
const invalidateQueries = vi.fn();
const updateLessonMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );

  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries }),
  };
});

vi.mock("@/api/endpoints", () => ({
  updateLesson: (...args: unknown[]) => updateLessonMock(...args),
}));

const lesson: Lesson = {
  id: 9,
  volume: 2,
  lesson_number: 14,
  title_ar: "درس الصلاة",
  chapter: { kitab: "كتاب الصلاة", bab: "باب الأذان", fasl: null },
  duration_seconds: 1800,
  upload_date: "2026-04-01",
  archive_url: "https://archive.org/download/example/lesson-v2-014.mp3",
  telegram_post_id: 77,
};

beforeEach(() => {
  replace.mockReset();
  invalidateQueries.mockReset();
  updateLessonMock.mockReset();
  updateLessonMock.mockResolvedValue({ data: { lesson } });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("EditLessonForm", () => {
  it("renders immutable fields as text and submits only dirty fields", async () => {
    const user = userEvent.setup();

    render(<EditLessonForm lesson={lesson} />);

    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("العنوان العربي"));
    await user.type(
      screen.getByLabelText("العنوان العربي"),
      "درس الصلاة - مراجع",
    );
    await user.clear(screen.getByLabelText("archive_url"));
    await user.type(
      screen.getByLabelText("archive_url"),
      "https://archive.org/download/example/lesson-v2-014-updated.mp3",
    );
    await user.click(screen.getByRole("button", { name: "حفظ" }));

    await waitFor(() => {
      expect(updateLessonMock).toHaveBeenCalledTimes(1);
    });

    expect(updateLessonMock).toHaveBeenCalledWith(9, {
      title_ar: "درس الصلاة - مراجع",
      archive_url:
        "https://archive.org/download/example/lesson-v2-014-updated.mp3",
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["lesson", 9] });
    expect(replace).toHaveBeenCalledWith("/admin");
  });

  it("shows inline error for 404 and toast for 409", async () => {
    const user = userEvent.setup();

    updateLessonMock.mockRejectedValueOnce({ status: 404, body: {} });
    const { rerender } = render(<EditLessonForm lesson={lesson} />);

    await user.click(screen.getByRole("button", { name: "حفظ" }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "الدرس لم يعد موجوداً",
      );
    });

    updateLessonMock.mockRejectedValueOnce({ status: 409, body: {} });
    rerender(<EditLessonForm lesson={lesson} />);
    await user.click(screen.getByRole("button", { name: "حفظ" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "تعارض — أعد المحاولة",
      );
    });
  });
});
