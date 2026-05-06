import { cn } from "@/utils/cn";

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary",
        className,
      )}
      {...props}
    />
  );
}

type FieldErrorProps = React.HTMLAttributes<HTMLParagraphElement>;

export function FieldError({ className, ...props }: FieldErrorProps) {
  return (
    <p
      role="alert"
      className={cn("mt-1 text-sm text-error", className)}
      {...props}
    />
  );
}
