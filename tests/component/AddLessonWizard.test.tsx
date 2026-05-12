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

const presignUpload = vi.fn();
const createLesson = vi.fn();

vi.mock("@/api/endpoints", () => ({
  presignUpload: (...args: unknown[]) => presignUpload(...args),
  createLesson: (...args: unknown[]) => createLesson(...args),
}));

class MockXHR {
  static lastInstance: MockXHR | null = null;

  responseText = "";
  status = 200;
  withCredentials = false;
  requestHeaders: Record<string, string> = {};
  upload = { onprogress: null as null | ((event: ProgressEvent) => void) };
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;

  constructor() {
    MockXHR.lastInstance = this;
  }

  open() {}

  setRequestHeader(key: string, value: string) {
    this.requestHeaders[key] = value;
  }

  send() {
    // Simulate progress
    this.upload.onprogress?.({
      lengthComputable: true,
      loaded: 50,
      total: 100,
    } as ProgressEvent);
  }

  getResponseHeader(key: string) {
    return this.requestHeaders[key] ?? null;
  }

  complete() {
    this.onload?.();
  }

  triggerError() {
    this.onerror?.();
  }
}

beforeEach(() => {
  invalidateQueries.mockReset();
  replace.mockReset();
  presignUpload.mockReset();
  createLesson.mockReset();

  presignUpload.mockResolvedValue({
    data: {
      presigned_url: "https://s3.archive.org/presigned",
      archive_url: "https://archive.org/download/item/lesson.mp3",
      required_headers: { "Content-Type": "audio/mpeg" },
    },
  });

  createLesson.mockResolvedValue({ data: { lesson: { id: 7 } } });

  vi.stubGlobal("XMLHttpRequest", MockXHR as never);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AddLessonWizard", () => {
  it("renders step 1 upload form initially", () => {
    render(<AddLessonWizard />);

    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Add Lesson")).toBeInTheDocument();
    expect(screen.getByLabelText("Volume")).toBeInTheDocument();
    expect(screen.getByLabelText("Lesson #")).toBeInTheDocument();
    expect(screen.getByLabelText("Audio File")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Request Upload Link" }),
    ).toBeInTheDocument();
  });

  it("validates file selection and lesson number", async () => {
    const user = userEvent.setup();
    render(<AddLessonWizard />);

    // Try to submit without selecting file - should not call presignUpload
    await user.click(
      screen.getByRole("button", { name: "Request Upload Link" }),
    );

    // Should still be on step 1
    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
    // presignUpload should NOT be called since file is missing
    expect(presignUpload).not.toHaveBeenCalled();
  });

  it("shows progress bar during upload", async () => {
    const user = userEvent.setup();
    render(<AddLessonWizard />);

    const file = new File(["audio content"], "lesson.mp3", {
      type: "audio/mpeg",
    });

    await user.upload(screen.getByLabelText("Audio File"), file);
    await user.type(screen.getByLabelText("Lesson #"), "12");
    await user.click(
      screen.getByRole("button", { name: "Request Upload Link" }),
    );

    // Progress bar should appear during upload
    await waitFor(() => {
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "50",
      );
    });

    // Complete the XHR request
    MockXHR.lastInstance?.complete();

    // Wait for step 2 to appear
    await waitFor(() => {
      expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
    });
  });

  it("auto-fills archive_url and advances to step 2 on successful upload", async () => {
    const user = userEvent.setup();
    render(<AddLessonWizard />);

    const file = new File(["audio content"], "lesson.mp3", {
      type: "audio/mpeg",
    });

    await user.upload(screen.getByLabelText("Audio File"), file);
    await user.type(screen.getByLabelText("Lesson #"), "12");
    await user.click(
      screen.getByRole("button", { name: "Request Upload Link" }),
    );

    MockXHR.lastInstance?.complete();

    await waitFor(() => {
      expect(screen.getByLabelText("Audio URL")).toHaveValue(
        "https://archive.org/download/item/lesson.mp3",
      );
    });

    expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("Upload complete")).toBeInTheDocument();
  });

  it("shows CORS fallback with curl command on status 0", async () => {
    const user = userEvent.setup();
    render(<AddLessonWizard />);

    const file = new File(["audio content"], "lesson.mp3", {
      type: "audio/mpeg",
    });

    await user.upload(screen.getByLabelText("Audio File"), file);
    await user.type(screen.getByLabelText("Lesson #"), "12");
    await user.click(
      screen.getByRole("button", { name: "Request Upload Link" }),
    );

    // Set status after submit and trigger error
    await waitFor(() => {
      if (MockXHR.lastInstance) {
        MockXHR.lastInstance.status = 0;
      }
    });

    MockXHR.lastInstance?.triggerError();

    await waitFor(() => {
      expect(
        screen.getByText(/Browser upload blocked \(CORS\)/),
      ).toBeInTheDocument();
    });

    // Check curl command is shown
    expect(screen.getByText(/curl -X PUT/)).toBeInTheDocument();

    // Can copy curl command
    const copyButton = screen.getByRole("button", { name: "Copy" });
    await user.click(copyButton);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Copied" }),
      ).toBeInTheDocument();
    });

    // Can advance to step 2 after manual upload
    await user.click(
      screen.getByRole("button", { name: /I uploaded successfully/ }),
    );

    await waitFor(() => {
      expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
    });
  });

  it("rejects file > 500MB client-side", async () => {
    const user = userEvent.setup();
    render(<AddLessonWizard />);

    // Create a large file mock
    const largeFile = new File(["x".repeat(501 * 1024 * 1024)], "large.mp3", {
      type: "audio/mpeg",
    });
    Object.defineProperty(largeFile, "size", { value: 501 * 1024 * 1024 });

    await user.upload(screen.getByLabelText("Audio File"), largeFile);
    await user.type(screen.getByLabelText("Lesson #"), "12");
    await user.click(
      screen.getByRole("button", { name: "Request Upload Link" }),
    );

    await waitFor(() => {
      expect(screen.getByText("File exceeds 500MB.")).toBeInTheDocument();
    });

    // presignUpload should not be called
    expect(presignUpload).not.toHaveBeenCalled();
  });

  it("rejects unsupported file types", async () => {
    const user = userEvent.setup();
    render(<AddLessonWizard />);

    const unsupportedFile = new File(["pdf content"], "document.pdf", {
      type: "application/pdf",
    });

    await user.upload(screen.getByLabelText("Audio File"), unsupportedFile);
    await user.type(screen.getByLabelText("Lesson #"), "12");
    await user.click(
      screen.getByRole("button", { name: "Request Upload Link" }),
    );

    // Should still be on step 1
    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
    // presignUpload should NOT be called since file type is unsupported
    expect(presignUpload).not.toHaveBeenCalled();
  });

  it("handles 403 presign link expired", async () => {
    const user = userEvent.setup();
    render(<AddLessonWizard />);

    const file = new File(["audio content"], "lesson.mp3", {
      type: "audio/mpeg",
    });

    await user.upload(screen.getByLabelText("Audio File"), file);
    await user.type(screen.getByLabelText("Lesson #"), "12");
    await user.click(
      screen.getByRole("button", { name: "Request Upload Link" }),
    );

    // Set status after submit
    await waitFor(() => {
      if (MockXHR.lastInstance) {
        MockXHR.lastInstance.status = 403;
      }
    });

    MockXHR.lastInstance?.complete();

    await waitFor(() => {
      expect(
        screen.getByText("Upload link expired. Request a new one."),
      ).toBeInTheDocument();
    });

    // Should show "Request new upload link" button
    expect(
      screen.getByRole("button", { name: "Request new upload link" }),
    ).toBeInTheDocument();
  });

  it("handles 429 rate limit", async () => {
    const user = userEvent.setup();
    render(<AddLessonWizard />);

    const file = new File(["audio content"], "lesson.mp3", {
      type: "audio/mpeg",
    });

    await user.upload(screen.getByLabelText("Audio File"), file);
    await user.type(screen.getByLabelText("Lesson #"), "12");
    await user.click(
      screen.getByRole("button", { name: "Request Upload Link" }),
    );

    // Set status and headers after submit
    await waitFor(() => {
      if (MockXHR.lastInstance) {
        MockXHR.lastInstance.status = 429;
        MockXHR.lastInstance.requestHeaders["Retry-After"] = "60";
      }
    });

    MockXHR.lastInstance?.complete();

    await waitFor(() => {
      expect(
        screen.getByText(/Rate limit exceeded. Try again in 60 seconds./),
      ).toBeInTheDocument();
    });
  });

  it("handles 502 service unavailable", async () => {
    const user = userEvent.setup();
    render(<AddLessonWizard />);

    const file = new File(["audio content"], "lesson.mp3", {
      type: "audio/mpeg",
    });

    await user.upload(screen.getByLabelText("Audio File"), file);
    await user.type(screen.getByLabelText("Lesson #"), "12");
    await user.click(
      screen.getByRole("button", { name: "Request Upload Link" }),
    );

    // Set status after submit
    await waitFor(() => {
      if (MockXHR.lastInstance) {
        MockXHR.lastInstance.status = 502;
      }
    });

    MockXHR.lastInstance?.complete();

    await waitFor(() => {
      expect(
        screen.getByText("Upload service unavailable. Please try again."),
      ).toBeInTheDocument();
    });
  });

  it("submits lesson data and redirects on success", async () => {
    const user = userEvent.setup();
    render(<AddLessonWizard />);

    const file = new File(["audio content"], "lesson.mp3", {
      type: "audio/mpeg",
    });

    await user.upload(screen.getByLabelText("Audio File"), file);
    await user.type(screen.getByLabelText("Lesson #"), "12");
    await user.click(
      screen.getByRole("button", { name: "Request Upload Link" }),
    );

    MockXHR.lastInstance?.complete();

    await waitFor(() => {
      expect(screen.getByLabelText("Audio URL")).toHaveValue(
        "https://archive.org/download/item/lesson.mp3",
      );
    });

    // Fill in step 2 form
    await user.type(screen.getByLabelText("Title (Arabic)"), "درس الطهارة");
    await user.type(screen.getByLabelText("Chapter (Arabic)"), "كتاب الطهارة");
    await user.type(screen.getByLabelText("Duration (seconds)"), "3720");
    await user.type(screen.getByLabelText("Upload Date"), "2026-04-01");
    await user.type(screen.getByLabelText("Telegram Post ID"), "99");

    await user.click(screen.getByRole("button", { name: "Save Lesson" }));

    await waitFor(() => {
      expect(createLesson).toHaveBeenCalled();
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["lessons", "all"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["admin", "lessons", "all"],
    });

    expect(replace).toHaveBeenCalledWith("/admin");
  });

  it("handles 409 duplicate lesson error", async () => {
    const user = userEvent.setup();
    render(<AddLessonWizard />);

    createLesson.mockRejectedValue({ status: 409 });

    const file = new File(["audio content"], "lesson.mp3", {
      type: "audio/mpeg",
    });

    await user.upload(screen.getByLabelText("Audio File"), file);
    await user.type(screen.getByLabelText("Lesson #"), "12");
    await user.click(
      screen.getByRole("button", { name: "Request Upload Link" }),
    );

    MockXHR.lastInstance?.complete();

    await waitFor(() => {
      expect(screen.getByLabelText("Audio URL")).toHaveValue(
        "https://archive.org/download/item/lesson.mp3",
      );
    });

    await user.type(screen.getByLabelText("Title (Arabic)"), "درس الطهارة");
    await user.type(screen.getByLabelText("Chapter (Arabic)"), "كتاب الطهارة");
    await user.type(screen.getByLabelText("Duration (seconds)"), "3720");
    await user.type(screen.getByLabelText("Upload Date"), "2026-04-01");
    await user.type(screen.getByLabelText("Telegram Post ID"), "99");

    await user.click(screen.getByRole("button", { name: "Save Lesson" }));

    await waitFor(() => {
      expect(
        screen.getByText("Duplicate lesson number in this volume."),
      ).toBeInTheDocument();
    });
  });

  it("handles 422 validation errors", async () => {
    const user = userEvent.setup();
    render(<AddLessonWizard />);

    createLesson.mockRejectedValue({
      status: 422,
      body: {
        error: {
          details: {
            title_ar: "Title is too short.",
            duration_seconds: "Duration must be positive.",
          },
        },
      },
    });

    const file = new File(["audio content"], "lesson.mp3", {
      type: "audio/mpeg",
    });

    await user.upload(screen.getByLabelText("Audio File"), file);
    await user.type(screen.getByLabelText("Lesson #"), "12");
    await user.click(
      screen.getByRole("button", { name: "Request Upload Link" }),
    );

    MockXHR.lastInstance?.complete();

    await waitFor(() => {
      expect(screen.getByLabelText("Audio URL")).toHaveValue(
        "https://archive.org/download/item/lesson.mp3",
      );
    });

    await user.type(screen.getByLabelText("Title (Arabic)"), "x");
    await user.type(screen.getByLabelText("Chapter (Arabic)"), "كتاب الطهارة");
    await user.type(screen.getByLabelText("Duration (seconds)"), "-1");
    await user.type(screen.getByLabelText("Upload Date"), "2026-04-01");
    await user.type(screen.getByLabelText("Telegram Post ID"), "99");

    await user.click(screen.getByRole("button", { name: "Save Lesson" }));

    await waitFor(() => {
      expect(screen.getByText("Title is too short.")).toBeInTheDocument();
      expect(
        screen.getByText("Duration must be positive."),
      ).toBeInTheDocument();
    });
  });

  it("redirects to login on 401 auth error during presign", async () => {
    const user = userEvent.setup();
    render(<AddLessonWizard />);

    presignUpload.mockRejectedValue({ status: 401 });

    const file = new File(["audio content"], "lesson.mp3", {
      type: "audio/mpeg",
    });

    await user.upload(screen.getByLabelText("Audio File"), file);
    await user.type(screen.getByLabelText("Lesson #"), "12");
    await user.click(
      screen.getByRole("button", { name: "Request Upload Link" }),
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/admin/login");
    });
  });

  it("redirects to login on 401 auth error during submit", async () => {
    const user = userEvent.setup();
    render(<AddLessonWizard />);

    createLesson.mockRejectedValue({ status: 401 });

    const file = new File(["audio content"], "lesson.mp3", {
      type: "audio/mpeg",
    });

    await user.upload(screen.getByLabelText("Audio File"), file);
    await user.type(screen.getByLabelText("Lesson #"), "12");
    await user.click(
      screen.getByRole("button", { name: "Request Upload Link" }),
    );

    MockXHR.lastInstance?.complete();

    await waitFor(() => {
      expect(screen.getByLabelText("Audio URL")).toHaveValue(
        "https://archive.org/download/item/lesson.mp3",
      );
    });

    await user.type(screen.getByLabelText("Title (Arabic)"), "درس الطهارة");
    await user.type(screen.getByLabelText("Chapter (Arabic)"), "كتاب الطهارة");
    await user.type(screen.getByLabelText("Duration (seconds)"), "3720");
    await user.type(screen.getByLabelText("Upload Date"), "2026-04-01");
    await user.type(screen.getByLabelText("Telegram Post ID"), "99");

    await user.click(screen.getByRole("button", { name: "Save Lesson" }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/admin/login");
    });
  });
});
