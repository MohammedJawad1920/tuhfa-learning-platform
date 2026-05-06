// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useRouter } from "next/navigation";
import * as endpoints from "@/api/endpoints";

vi.mock("next/navigation");
vi.mock("@/api/endpoints");

const mockRouter = { replace: vi.fn() };
(useRouter as any).mockReturnValue(mockRouter);

function renderHookWithProviders<T>(hook: () => T) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return renderHook(hook, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

describe("useAdminAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouter.replace.mockClear();
  });

  it("successfully authenticates and navigates to /admin", async () => {
    (endpoints.adminAuth as any).mockResolvedValue({
      data: { authenticated: true },
    });

    const { result } = renderHookWithProviders(() => useAdminAuth());

    result.current.authenticate("correct_password");

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/admin");
    });
  });

  it("handles 401 unauthorized with Arabic message", async () => {
    const error = new Error("HTTP 401");
    (error as any).status = 401;
    (error as any).body = { error: { details: {} } };
    (endpoints.adminAuth as any).mockRejectedValue(error);

    const { result } = renderHookWithProviders(() => useAdminAuth());

    result.current.authenticate("wrong_password");

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.fieldErrors?.password).toBe(
        "كلمة المرور غير صحيحة",
      );
    });
  });

  it("handles 422 validation errors", async () => {
    const error = new Error("HTTP 422");
    (error as any).status = 422;
    (error as any).body = {
      error: { details: { password: "Password is required" } },
    };
    (endpoints.adminAuth as any).mockRejectedValue(error);

    const { result } = renderHookWithProviders(() => useAdminAuth());

    result.current.authenticate("");

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.fieldErrors?.password).toBe(
        "Password is required",
      );
    });
  });

  it("handles 429 rate limit error", async () => {
    const error = new Error("HTTP 429");
    (error as any).status = 429;
    (error as any).body = { error: { details: {} } };
    (endpoints.adminAuth as any).mockRejectedValue(error);

    const { result } = renderHookWithProviders(() => useAdminAuth());

    result.current.authenticate("password");

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.inlineError).toBe(
        "تم تجاوز الحد — حاول بعد 15 دقيقة",
      );
    });
  });

  it("handles 500 server error", async () => {
    const error = new Error("HTTP 500");
    (error as any).status = 500;
    (error as any).body = { error: { details: {} } };
    (endpoints.adminAuth as any).mockRejectedValue(error);

    const { result } = renderHookWithProviders(() => useAdminAuth());

    result.current.authenticate("password");

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.inlineError).toBe(
        "خطأ في الخادم — حاول لاحقاً",
      );
    });
  });

  it("shows loading state during authentication", async () => {
    (endpoints.adminAuth as any).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: { authenticated: true } }), 100),
        ),
    );

    const { result, rerender } = renderHookWithProviders(() => useAdminAuth());

    expect(result.current.isLoading).toBe(false);

    result.current.authenticate("password");

    // The mutation needs time to update the state
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});
