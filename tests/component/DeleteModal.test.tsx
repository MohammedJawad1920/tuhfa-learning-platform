// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DeleteModal } from "@/components/admin/DeleteModal";

describe("DeleteModal", () => {
  it("renders the dialog and buttons", () => {
    render(
      <DeleteModal
        lessonId={7}
        isOpen
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "حذف الدرس" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("هل تريد حذف الدرس 7؟ لا يمكن التراجع عن هذا الإجراء."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "حذف" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "إلغاء" })).toBeInTheDocument();
  });

  it("calls confirm, cancel, and escape handlers", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <DeleteModal
        lessonId={7}
        isOpen
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole("button", { name: "حذف" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "إلغاء" }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
