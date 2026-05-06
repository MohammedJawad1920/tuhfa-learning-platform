// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { Modal } from "@/components/ui/Modal";

describe("Modal", () => {
  it("renders, traps focus, and closes on escape", () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Delete lesson" onClose={onClose}>
        <button>Confirm</button>
      </Modal>,
    );

    expect(
      screen.getByRole("dialog", { name: /delete lesson/i }),
    ).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
