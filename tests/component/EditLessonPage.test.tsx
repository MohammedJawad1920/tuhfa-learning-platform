// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

import EditLessonPage from "@/app/admin/lessons/[id]/edit/page";
import type { Lesson } from "@/types/lesson";

const replace = vi.fn();
const getLessonByIdMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "9" }),
  useRouter: () => ({ replace }),
}));

vi.mock("@/api/endpoints", () => ({
  getLessonById: (...args: unknown[]) => getLessonByIdMock(...args),
}));

vi.mock("@/components/admin/EditLessonForm", () => ({
  EditLessonForm: ({ lesson }: { lesson: Lesson }) => (
    <div data-testid="edit-form">{lesson.title_ar}</div>
  ),
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

function renderWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <EditLessonPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  replace.mockReset();
  getLessonByIdMock.mockReset();
  getLessonByIdMock.mockResolvedValue({ data: { lesson } });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("EditLessonPage", () => {
  it("loads the lesson and renders the form", async () => {
    renderWithClient();

    expect(screen.getByRole("status")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("edit-form")).toHaveTextContent("درس الصلاة");
    });

    expect(getLessonByIdMock).toHaveBeenCalledWith(9);
  });

  it("shows not-found state when the lesson is missing", async () => {
    getLessonByIdMock.mockRejectedValueOnce({ status: 404, body: {} });
    renderWithClient();

    await waitFor(() => {
      expect(screen.getByText("Lesson not found.")).toBeInTheDocument();
    });
  });
});
