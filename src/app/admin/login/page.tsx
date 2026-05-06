"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label, FieldError } from "@/components/ui/Field";
import { Toast } from "@/components/ui/Toast";

type LoginFormData = {
  password: string;
};

export default function AdminLoginPage() {
  const { register, handleSubmit, formState, setFocus } =
    useForm<LoginFormData>({
      defaultValues: { password: "" },
    });

  const { authenticate, isLoading, error } = useAdminAuth();
  const [showServerError, setShowServerError] = useState(false);

  // Focus on password input on mount
  useEffect(() => {
    setFocus("password");
  }, [setFocus]);

  const onSubmit = (data: LoginFormData) => {
    setShowServerError(false);
    authenticate(data.password);
  };

  useEffect(() => {
    if (error?.inlineError) {
      setShowServerError(true);
    }
  }, [error?.inlineError]);

  const passwordError =
    formState.errors.password?.message || error?.fieldErrors?.password;
  const errorId = passwordError ? "password-error" : undefined;

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface-card p-8">
        <h1 className="mb-6 text-2xl font-bold text-text-primary">
          دخول المسؤول
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              placeholder="أدخل كلمة المرور"
              aria-describedby={errorId}
              {...register("password", {
                required: "كلمة المرور مطلوبة",
                minLength: {
                  value: 1,
                  message: "كلمة المرور مطلوبة",
                },
                maxLength: {
                  value: 128,
                  message: "كلمة المرور طويلة جداً",
                },
              })}
            />
            {passwordError ? (
              <FieldError id={errorId}>{passwordError}</FieldError>
            ) : null}
          </div>

          <Button
            type="submit"
            loading={isLoading}
            disabled={isLoading}
            className="w-full"
          >
            دخول
          </Button>
        </form>
      </div>

      {error?.inlineError ? (
        <Toast
          open={showServerError}
          variant="error"
          onClose={() => setShowServerError(false)}
        >
          {error.inlineError}
        </Toast>
      ) : null}
    </main>
  );
}
