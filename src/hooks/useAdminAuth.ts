"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import * as endpoints from "@/api/endpoints";

export type AdminAuthError = {
  fieldErrors?: Record<string, string>;
  inlineError?: string;
};

type ErrorWithStatus = Error & {
  status?: number;
  body?: Record<string, unknown>;
};

export function useAdminAuth() {
  const router = useRouter();

  const mutation = useMutation<void, AdminAuthError, string>({
    mutationFn: async (password: string) => {
      try {
        await endpoints.adminAuth(password);
      } catch (err: unknown) {
        const error = err as ErrorWithStatus;
        const status = error?.status;
        const body = error?.body;

        if (status === 401) {
          throw {
            fieldErrors: { password: "كلمة المرور غير صحيحة" },
          } as AdminAuthError;
        }

        if (status === 422) {
          const details =
            (body?.error as Record<string, unknown>)?.details || {};
          throw {
            fieldErrors: details as Record<string, string>,
          } as AdminAuthError;
        }

        if (status === 429) {
          throw {
            inlineError: "تم تجاوز الحد — حاول بعد 15 دقيقة",
          } as AdminAuthError;
        }

        if (status === 500 || status === 502) {
          throw {
            inlineError: "خطأ في الخادم — حاول لاحقاً",
          } as AdminAuthError;
        }

        // Re-throw unknown errors
        throw error;
      }
    },
    onSuccess: () => {
      router.replace("/admin");
    },
    retry: 0, // No automatic retry for rate-limited endpoint
  });

  return {
    authenticate: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
