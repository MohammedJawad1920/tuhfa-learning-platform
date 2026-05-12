// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { useAdminAuth } from "@/hooks/useAdminAuth";

vi.mock("@/hooks/useAdminAuth");

const mockUseAdminAuth = useAdminAuth as unknown as {
  mockReturnValue: (value: unknown) => void;
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminLoginForm />
    </QueryClientProvider>,
  );
}

describe("AdminLoginForm", () => {
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
    expect(screen.getByText("Admin login")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("focuses on password input on mount", async () => {
    renderPage();
    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
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

    const passwordInput = screen.getByLabelText("Password");
    const submitButton = screen.getByRole("button", { name: "Sign in" });

    await user.type(passwordInput, "test_password");
    await user.click(submitButton);

    await waitFor(() => {
      expect(authenticate).toHaveBeenCalledWith("test_password");
    });
  });

  it("shows field validation error for empty password", async () => {
    renderPage();
    const user = userEvent.setup();

    const submitButton = screen.getByRole("button", { name: "Sign in" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Password is required")).toBeInTheDocument();
    });
  });

  it("shows field error for 401 unauthorized", async () => {
    mockUseAdminAuth.mockReturnValue({
      authenticate: vi.fn(),
      isLoading: false,
      error: {
        fieldErrors: { password: "Incorrect password" },
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Incorrect password")).toBeInTheDocument();
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

  it("shows inline error for 429 rate limit", async () => {
    mockUseAdminAuth.mockReturnValue({
      authenticate: vi.fn(),
      isLoading: false,
      error: {
        inlineError: "Rate limit exceeded — try again in 15 minutes",
      },
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText("Rate limit exceeded — try again in 15 minutes"),
      ).toBeInTheDocument();
    });
  });

  it("shows inline error for 500 server error", async () => {
    mockUseAdminAuth.mockReturnValue({
      authenticate: vi.fn(),
      isLoading: false,
      error: {
        inlineError: "Server error — try again later",
      },
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText("Server error — try again later"),
      ).toBeInTheDocument();
    });
  });

  it("shows loading state and disables button during submission", () => {
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
        fieldErrors: { password: "Incorrect password" },
      },
    });

    renderPage();

    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    const errorElement = screen.getByText("Incorrect password");

    await waitFor(() => {
      expect(passwordInput.getAttribute("aria-describedby")).toBe(
        "password-error",
      );
      expect(errorElement.id).toBe("password-error");
    });
  });

  it("does not set aria-describedby when no error", () => {
    renderPage();

    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    expect(passwordInput.getAttribute("aria-describedby")).toBeNull();
  });
});
