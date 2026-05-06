// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AddLessonWizard } from "@/components/admin/AddLessonWizard";

const invalidateQueries = vi.fn();
const replace = vi.fn();

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

const createLesson = vi.fn();

vi.mock("@/api/endpoints", () => ({
  uploadAudio: vi.fn(),
  createLesson: (...args: unknown[]) => createLesson(...args),
}));

class MockXHR {
  static lastInstance: MockXHR | null = null;

  responseText = "";
  status = 200;
  withCredentials = false;
  upload = { onprogress: null as null | ((event: ProgressEvent) => void) };
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;

  constructor() {
    MockXHR.lastInstance = this;
  }

  open() {}

  send() {
    this.responseText = JSON.stringify({
      data: {
        archive_url: "https://archive.org/download/item/lesson-v1-001.mp3",
        filename: "lesson-v1-001.mp3",
        size_bytes: 123,
      },
    });
    this.upload.onprogress?.({
      lengthComputable: true,
      loaded: 50,
      total: 100,
    } as ProgressEvent);
  }

  complete() {
    this.onload?.();
  }
}

beforeEach(() => {
  invalidateQueries.mockReset();
  replace.mockReset();
  createLesson.mockReset();
  createLesson.mockResolvedValue({ data: { lesson: { id: 7 } } });
  vi.stubGlobal("XMLHttpRequest", MockXHR as never);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AddLessonWizard", () => {
  it("shows upload progress and pre-populates the second step", async () => {
    const user = userEvent.setup();
    render(<AddLessonWizard />);

    const file = new File(["audio"], "lesson.mp3", { type: "audio/mpeg" });

    await user.upload(screen.getByLabelText("الملف الصوتي"), file);
    await user.type(screen.getByLabelText("رقم الدرس"), "12");
    await user.click(screen.getByRole("button", { name: "رفع الملف" }));

    await waitFor(() => {
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "50",
      );
    });

    MockXHR.lastInstance?.complete();

    await waitFor(() => {
      expect(screen.getByLabelText("archive_url")).toHaveValue(
        "https://archive.org/download/item/lesson-v1-001.mp3",
      );
    });

    expect(screen.getByRole("button", { name: "رجوع" })).toBeDisabled();
  });

  it("submits lesson data and redirects on success", async () => {
    const user = userEvent.setup();
    render(<AddLessonWizard />);

    const file = new File(["audio"], "lesson.mp3", { type: "audio/mpeg" });

    await user.upload(screen.getByLabelText("الملف الصوتي"), file);
    await user.type(screen.getByLabelText("رقم الدرس"), "12");
    await user.click(screen.getByRole("button", { name: "رفع الملف" }));

    MockXHR.lastInstance?.complete();

    await waitFor(() => {
      expect(screen.getByLabelText("archive_url")).toHaveValue(
        "https://archive.org/download/item/lesson-v1-001.mp3",
      );
    });

    await user.type(screen.getByLabelText("العنوان العربي"), "درس الطهارة");
    await user.type(screen.getByLabelText("الكتاب"), "كتاب الطهارة");
    await user.type(screen.getByLabelText("المدة بالثواني"), "3720");
    await user.type(screen.getByLabelText("تاريخ الرفع"), "2026-04-01");
    await user.type(screen.getByLabelText("معرف منشور Telegram"), "99");
    await user.click(screen.getByRole("button", { name: "حفظ الدرس" }));

    await waitFor(() => {
      expect(createLesson).toHaveBeenCalled();
    });
    expect(invalidateQueries).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/admin");
  });
});
