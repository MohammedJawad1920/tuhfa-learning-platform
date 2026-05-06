import { cn } from "@/utils/cn";

type ProgressBarProps = {
  value: number;
  label?: string;
};

export function ProgressBar({ value, label }: ProgressBarProps) {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div aria-label={label}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
        className="h-3 w-full overflow-hidden rounded-full bg-surface"
      >
        <div
          className={cn("h-full rounded-full bg-primary transition-[width]")}
          style={{ width: `${safeValue}%` }}
        />
      </div>
      {label ? (
        <p className="mt-2 text-sm text-text-secondary">{label}</p>
      ) : null}
    </div>
  );
}
