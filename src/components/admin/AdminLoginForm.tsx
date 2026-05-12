"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label, FieldError } from "@/components/ui/Field";

type LoginFormData = {
  password: string;
};

export function AdminLoginForm() {
  const { register, handleSubmit, formState, setFocus } =
    useForm<LoginFormData>({
      defaultValues: { password: "" },
    });

  const { authenticate, isLoading, error } = useAdminAuth();
  const [showInlineError, setShowInlineError] = useState(false);

  useEffect(() => {
    setFocus("password");
  }, [setFocus]);

  useEffect(() => {
    setShowInlineError(Boolean(error?.inlineError));
  }, [error?.inlineError]);

  const onSubmit = (data: LoginFormData) => {
    setShowInlineError(false);
    authenticate(data.password);
  };

  const passwordError =
    formState.errors.password?.message || error?.fieldErrors?.password;
  const errorId = passwordError ? "password-error" : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface-card p-8">
        <h1 className="mb-6 text-2xl font-bold text-text-primary">
          Admin login
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password"
              aria-describedby={errorId}
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 1,
                  message: "Password is required",
                },
                maxLength: {
                  value: 128,
                  message: "Password is too long",
                },
              })}
            />
            {passwordError ? (
              <FieldError id={errorId}>{passwordError}</FieldError>
            ) : null}
          </div>

          {error?.inlineError ? (
            <p role="alert" className="text-sm text-error">
              {showInlineError ? error.inlineError : null}
            </p>
          ) : null}

          <Button
            type="submit"
            loading={isLoading}
            disabled={isLoading}
            className="w-full"
          >
            Sign in
          </Button>
        </form>
      </div>
    </main>
  );
}

export default AdminLoginForm;
