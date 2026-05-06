// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminLoginPage from "@/app/admin/login/page";
import { useAdminAuth } from "@/hooks/useAdminAuth";

vi.mock("@/hooks/useAdminAuth");

const mockUseAdminAuth = useAdminAuth as any;

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminLoginPage />
    </QueryClientProvider>,
  );
}

describe("Admin Login Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminAuth.mockReturnValue({
      authenticate: vi.fn(),
      isLoading: false,
      error: null,
    });
  });

  it("renders the login form", () => {
    renderPage();
    expect(screen.getByText("دخول المسؤول")).toBeInTheDocument();
    expect(screen.getByLabelText("كلمة المرور")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "دخول" })).toBeInTheDocument();
  });

  it("focuses on password input on mount", async () => {
    renderPage();
    const passwordInput = screen.getByLabelText(
      "كلمة المرور",
    ) as HTMLInputElement;
    await waitFor(() => {
      expect(passwordInput).toHaveFocus();
    });
  });

  it("calls authenticate with password on form submit", async () => {
    const authenticate = vi.fn();
    mockUseAdminAuth.mockReturnValue({
      authenticate,
      isLoading: false,
      error: null,
    });

    renderPage();
    const user = userEvent.setup();

    const passwordInput = screen.getByLabelText("كلمة المرور");
    const submitButton = screen.getByRole("button", { name: "دخول" });

    await user.type(passwordInput, "test_password");
    await user.click(submitButton);

    await waitFor(() => {
      expect(authenticate).toHaveBeenCalledWith("test_password");
    });
  });

  it("shows field validation error for empty password", async () => {
    renderPage();
    const user = userEvent.setup();

    const submitButton = screen.getByRole("button", { name: "دخول" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("كلمة المرور مطلوبة")).toBeInTheDocument();
    });
  });

  it("shows field error for 401 unauthorized", async () => {
    mockUseAdminAuth.mockReturnValue({
      authenticate: vi.fn(),
      isLoading: false,
      error: {
        fieldErrors: { password: "كلمة المرور غير صحيحة" },
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("كلمة المرور غير صحيحة")).toBeInTheDocument();
    });
  });

  it("shows field error from 422 validation response", async () => {
    mockUseAdminAuth.mockReturnValue({
      authenticate: vi.fn(),
      isLoading: false,
      error: {
        fieldErrors: { password: "Password must not be empty" },
      },
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText("Password must not be empty"),
      ).toBeInTheDocument();
    });
  });

  it("shows inline error toast for 429 rate limit", async () => {
    mockUseAdminAuth.mockReturnValue({
      authenticate: vi.fn(),
      isLoading: false,
      error: {
        inlineError: "تم تجاوز الحد — حاول بعد 15 دقيقة",
      },
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText("تم تجاوز الحد — حاول بعد 15 دقيقة"),
      ).toBeInTheDocument();
    });
  });

  it("shows inline error toast for 500 server error", async () => {
    mockUseAdminAuth.mockReturnValue({
      authenticate: vi.fn(),
      isLoading: false,
      error: {
        inlineError: "خطأ في الخادم — حاول لاحقاً",
      },
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText("خطأ في الخادم — حاول لاحقاً"),
      ).toBeInTheDocument();
    });
  });

  it("shows loading state and disables button during submission", async () => {
    const authenticate = vi.fn();
    mockUseAdminAuth.mockReturnValue({
      authenticate,
      isLoading: true,
      error: null,
    });

    renderPage();

    const submitButton = screen.getByRole("button", { name: /Loading/i });
    expect(submitButton).toBeDisabled();
  });

  it("sets aria-describedby when error is present", async () => {
    mockUseAdminAuth.mockReturnValue({
      authenticate: vi.fn(),
      isLoading: false,
      error: {
        fieldErrors: { password: "كلمة المرور غير صحيحة" },
      },
    });

    renderPage();

    const passwordInput = screen.getByLabelText(
      "كلمة المرور",
    ) as HTMLInputElement;
    const errorElement = screen.getByText("كلمة المرور غير صحيحة");

    await waitFor(() => {
      expect(passwordInput.getAttribute("aria-describedby")).toBe(
        "password-error",
      );
      expect(errorElement.id).toBe("password-error");
    });
  });

  it("does not set aria-describedby when no error", () => {
    renderPage();

    const passwordInput = screen.getByLabelText(
      "كلمة المرور",
    ) as HTMLInputElement;
    expect(passwordInput.getAttribute("aria-describedby")).toBeNull();
  });
});
