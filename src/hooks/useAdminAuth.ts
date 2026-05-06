"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import * as endpoints from "@/api/endpoints";
import type { components } from "@/types/api";

export type AdminAuthError = {
  fieldErrors?: Record<string, string>;
  inlineError?: string;
};

export function useAdminAuth() {
  const router = useRouter();

  const mutation = useMutation<void, AdminAuthError, string>({
    mutationFn: async (password: string) => {
      try {
        await endpoints.adminAuth(password);
      } catch (err: unknown) {
        const error = err as any;
        const status = error?.status as number | undefined;
        const body = error?.body as any;

        if (status === 401) {
          throw {
            fieldErrors: { password: "كلمة المرور غير صحيحة" },
          } as AdminAuthError;
        }

        if (status === 422) {
          const details = body?.error?.details || {};
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
