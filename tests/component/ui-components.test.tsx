// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldError, Label } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";

describe("ui primitives", () => {
  it("renders spinner and badge", () => {
    render(
      <>
        <Spinner />
        <Badge variant="completed">Completed</Badge>
      </>,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders interactive form controls", () => {
    render(
      <>
        <Label htmlFor="title">Title</Label>
        <Input id="title" />
        <Select aria-label="Volume">
          <option value="1">1</option>
        </Select>
        <Textarea aria-label="Notes" />
        <FieldError>Required</FieldError>
      </>,
    );

    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Volume")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });

  it("renders button loading state", () => {
    render(<Button loading>Save</Button>);

    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("renders pagination and progress bar", () => {
    const onPageChange = vi.fn();
    render(
      <Pagination currentPage={2} totalPages={3} onPageChange={onPageChange} />,
    );
    render(<ProgressBar value={70} label="Upload progress" />);

    fireEvent.click(screen.getByRole("button", { name: /page 3/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "70",
    );
  });

  it("renders and auto-dismisses success toast", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    render(
      <Toast open variant="success" onClose={onClose}>
        Saved
      </Toast>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Saved");

    vi.advanceTimersByTime(5000);
    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
