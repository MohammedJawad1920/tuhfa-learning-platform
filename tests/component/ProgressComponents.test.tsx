// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProgressBadge } from "@/features/progress/ProgressBadge";
import { MarkCompleteButton } from "@/features/progress/MarkCompleteButton";

// Mock useProgress hook
vi.mock("@/hooks/useProgress", () => ({
  useProgress: () => ({
    getProgress: vi.fn((id) => {
      if (id === 1) {
        return {
          completed: true,
          positionSeconds: 0,
          lastPlayedAt: new Date().toISOString(),
        };
      }
      if (id === 2) {
        return {
          completed: false,
          positionSeconds: 100,
          lastPlayedAt: new Date().toISOString(),
        };
      }
      return null;
    }),
    savePosition: vi.fn(),
    markComplete: vi.fn(),
  }),
}));

describe("ProgressBadge", () => {
  it("shows nothing for unknown lesson", () => {
    const { container } = render(<ProgressBadge lessonId={999} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows completed badge when lesson is completed", () => {
    render(<ProgressBadge lessonId={1} />);
    expect(screen.getByText("مُنجَز")).toBeInTheDocument();
  });

  it("shows in-progress badge when lesson has position but not completed", () => {
    render(<ProgressBadge lessonId={2} />);
    expect(screen.getByText("جاري")).toBeInTheDocument();
  });
});

describe("MarkCompleteButton", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders button element", () => {
    render(<MarkCompleteButton lessonId={1} />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("shows completed text when lesson is completed", () => {
    render(<MarkCompleteButton lessonId={1} />);
    expect(screen.getByText("✓ مُنجَز")).toBeInTheDocument();
  });

  it("shows incomplete text when lesson is not completed", () => {
    render(<MarkCompleteButton lessonId={2} />);
    expect(screen.getByText("وضّح كمُنجَز")).toBeInTheDocument();
  });

  it("is disabled when completed", () => {
    render(<MarkCompleteButton lessonId={1} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("is not disabled when not completed", () => {
    render(<MarkCompleteButton lessonId={2} />);
    const button = screen.getByRole("button");
    expect(button).not.toBeDisabled();
  });

  it("has aria-pressed attribute", () => {
    render(<MarkCompleteButton lessonId={1} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });
});
