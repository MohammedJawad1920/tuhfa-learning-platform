// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

import * as endpoints from "@/api/endpoints";
import { useAllLessons, useFilteredLessons } from "@/hooks/useLessons";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("useAllLessons", () => {
  it("fetches 4 pages and merges results", async () => {
    const page1 = {
      data: { lessons: [{ id: 1, volume: 1, lesson_number: 1 }] },
    };
    const page2 = {
      data: { lessons: [{ id: 2, volume: 1, lesson_number: 2 }] },
    };
    const page3 = {
      data: { lessons: [{ id: 3, volume: 2, lesson_number: 1 }] },
    };
    const page4 = { data: { lessons: [] } };

    const spy = vi.spyOn(endpoints, "listLessons");
    spy
      .mockResolvedValueOnce(page1 as any)
      .mockResolvedValueOnce(page2 as any)
      .mockResolvedValueOnce(page3 as any)
      .mockResolvedValueOnce(page4 as any);

    function C() {
      const q = useAllLessons();
      if (q.isLoading) return <div>loading</div>;
      return <div data-testid="count">{(q.data as any).length}</div>;
    }

    renderWithClient(<C />);

    await waitFor(() =>
      expect(screen.getByTestId("count")).toHaveTextContent("3"),
    );
    spy.mockRestore();
  });
});

describe("useFilteredLessons", () => {
  it("calls listLessons with filters and pagination", async () => {
    const resp = {
      data: { lessons: [{ id: 10, volume: 1, lesson_number: 5 }] },
    };
    const spy = vi
      .spyOn(endpoints, "listLessons")
      .mockResolvedValue(resp as any);

    function C() {
      const q = useFilteredLessons({ volume: 1, kitab: "K" }, 2, 10);
      if (q.isLoading) return <div>loading</div>;
      return <div data-testid="first">{(q.data as any)[0].id}</div>;
    }

    renderWithClient(<C />);

    await waitFor(() =>
      expect(screen.getByTestId("first")).toHaveTextContent("10"),
    );

    expect(spy).toHaveBeenCalledWith({
      volume: 1,
      kitab: "K",
      limit: 10,
      offset: 10,
    });
    spy.mockRestore();
  });
});
