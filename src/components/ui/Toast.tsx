import { useEffect } from "react";

import { cn } from "@/utils/cn";

type ToastVariant = "success" | "error" | "warning";

type ToastProps = {
  open: boolean;
  variant: ToastVariant;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  durationMs?: number;
};

const variantClasses: Record<ToastVariant, string> = {
  success: "border-success bg-success/10 text-success",
  error: "border-error bg-error/10 text-error",
  warning: "border-warning bg-warning/10 text-warning",
};

export function Toast({
  open,
  variant,
  title,
  children,
  onClose,
  durationMs = 5000,
}: ToastProps) {
  useEffect(() => {
    if (!open || !onClose) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onClose();
    }, durationMs);

    return () => window.clearTimeout(timeoutId);
  }, [durationMs, onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed end-4 top-4 z-50 w-[min(24rem,calc(100vw-2rem))]">
      <div
        className={cn(
          "rounded-lg border px-4 py-3 shadow-lg",
          variantClasses[variant],
        )}
        role={variant === "success" ? "status" : "alert"}
      >
        {title ? <p className="text-sm font-semibold">{title}</p> : null}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
