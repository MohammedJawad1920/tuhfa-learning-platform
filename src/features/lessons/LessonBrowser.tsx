"use client";

import { useReducer } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import {
  useAllLessons,
  useFilteredLessons,
  type FilterParams,
} from "@/hooks/useLessons";
import { LessonCard } from "./LessonCard";
import { ChapterNav } from "./ChapterNav";

type LessonBrowserState = {
  activeVolume?: 1 | 2 | 3 | 4;
  activeKitab?: string;
  activeBab?: string;
  activeFasl?: string;
  searchQuery: string;
  currentPage: number;
};

type LessonBrowserAction =
  | { type: "SET_FILTERS"; payload: FilterParams }
  | { type: "SET_SEARCH"; payload: string }
  | { type: "SET_PAGE"; payload: number }
  | { type: "RESET" };

const initialState: LessonBrowserState = {
  searchQuery: "",
  currentPage: 1,
};

function reducer(
  state: LessonBrowserState,
  action: LessonBrowserAction,
): LessonBrowserState {
  switch (action.type) {
    case "SET_FILTERS":
      return {
        ...state,
        activeVolume: action.payload.volume,
        activeKitab: action.payload.kitab,
        activeBab: action.payload.bab,
        activeFasl: action.payload.fasl,
        currentPage: 1,
      };
    case "SET_SEARCH":
      return {
        ...state,
        searchQuery: action.payload,
        currentPage: 1,
      };
    case "SET_PAGE":
      return {
        ...state,
        currentPage: action.payload,
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const LIMIT = 50;

export function LessonBrowser() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const allLessonsQuery = useAllLessons();
  const allLessons = allLessonsQuery.data ?? [];

  const filters: FilterParams = {
    volume: state.activeVolume,
    kitab: state.activeKitab,
    bab: state.activeBab,
    fasl: state.activeFasl,
    search: state.searchQuery.length >= 2 ? state.searchQuery : undefined,
  };

  const filteredQuery = useFilteredLessons(filters, state.currentPage, LIMIT);
  const lessons = filteredQuery.data?.lessons ?? [];
  const total = filteredQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const handleFilterChange = (newFilters: FilterParams) => {
    dispatch({ type: "SET_FILTERS", payload: newFilters });
  };

  const handleSearchChange = (query: string) => {
    dispatch({ type: "SET_SEARCH", payload: query });
  };

  const handlePageChange = (page: number) => {
    dispatch({ type: "SET_PAGE", payload: page });
  };

  const handleReset = () => {
    dispatch({ type: "RESET" });
  };

  if (allLessonsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (allLessonsQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="rounded-lg border border-border bg-surface-card p-6 text-center">
          <p className="mb-4 text-error">Failed to load lessons</p>
          <Button onClick={() => allLessonsQuery.refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  const isEmpty = !filteredQuery.isLoading && lessons.length === 0;

  return (
    <main className="min-h-screen bg-surface px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-display font-bold text-text-primary">
                Tuhfa Learning Platform
              </h1>
              <p className="mt-2 text-text-secondary">
                Browse lessons and filter by chapter structure.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                aria-label="Search lessons"
                value={state.searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search lessons"
                className="sm:w-72"
              />
              <Button variant="ghost" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <ChapterNav
              lessons={allLessons}
              onFilterChange={handleFilterChange}
            />
          </aside>

          <section className="space-y-4">
            <div className="flex items-center justify-between text-sm text-text-secondary">
              <span>{total} lessons</span>
              <span>
                Page {state.currentPage} of {totalPages}
              </span>
            </div>

            {filteredQuery.isLoading ? (
              <div className="rounded-lg border border-border bg-surface-card p-8 text-center">
                <Spinner />
              </div>
            ) : isEmpty ? (
              <div className="rounded-lg border border-border bg-surface-card p-8 text-center">
                <p className="text-text-primary">No matching lessons</p>
                <p dir="rtl" lang="ar" className="mt-2 text-text-secondary">
                  لا توجد دروس مطابقة
                </p>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border border-border bg-surface-card">
                {lessons.map((lesson) => (
                  <LessonCard key={lesson.id} lesson={lesson} />
                ))}
              </div>
            )}

            <Pagination
              currentPage={state.currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </section>
        </div>
      </div>
    </main>
  );
}

export default LessonBrowser;
