"use client";

import { useReducer, useEffect, useRef } from "react";
import {
  useAllLessons,
  useFilteredLessons,
  type FilterParams,
} from "@/hooks/useLessons";
import { ChapterNav } from "./ChapterNav";
import { LessonCard } from "./LessonCard";
import { Spinner } from "@/components/ui/Spinner";
import { Toast } from "@/components/ui/Toast";
import { Pagination } from "@/components/ui/Pagination";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface LessonBrowserState {
  activeVolume?: number;
  activeKitab?: string;
  activeBab?: string;
  activeFasl?: string;
  searchQuery: string;
  currentPage: number;
}

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
        activeFasl: action.payload.search ? undefined : state.activeFasl,
        currentPage: 1, // Reset to page 1 on filter change
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
  const firstLessonRef = useRef<HTMLLIElement>(null);

  // Fetch all lessons for chapter nav
  const allLessonsQuery = useAllLessons();

  // Fetch filtered lessons
  const filters: FilterParams = {
    volume: state.activeVolume as any,
    kitab: state.activeKitab,
    bab: state.activeBab,
    search: state.searchQuery.length >= 2 ? state.searchQuery : undefined,
  };
  const filteredQuery = useFilteredLessons(filters, state.currentPage, LIMIT);

  // Handle pagination - focus on first lesson
  useEffect(() => {
    if (firstLessonRef.current && !filteredQuery.isLoading) {
      firstLessonRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [state.currentPage, filteredQuery.isLoading]);

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

  // Loading state - show spinner while fetching all lessons
  if (allLessonsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Error state for all lessons load
  if (allLessonsQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg border border-error bg-surface-card p-6 text-center">
          <p className="text-error mb-4">خطأ في تحميل الدروس</p>
          <Button onClick={() => allLessonsQuery.refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  const allLessons = allLessonsQuery.data || [];

  // Render filtered results
  const lessons = filteredQuery.data || [];
  const isLoading = filteredQuery.isLoading;
  const isError = filteredQuery.isError;
  const isEmpty = !isLoading && lessons.length === 0;

  const totalPages = Math.ceil(
    (lessons.length === 0 ? 0 : LIMIT * state.currentPage) / LIMIT,
  );

  return (
    <main className="min-h-screen bg-surface py-8 px-4">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-4xl font-bold text-text-primary">
          متصفح الدروس
        </h1>

        <div className="grid gap-8 lg:grid-cols-4 lg:gap-6">
          {/* Chapter Nav Sidebar */}
          <aside className="lg:col-span-1">
            <ChapterNav
              lessons={allLessons}
              onFilterChange={handleFilterChange}
            />
          </aside>

          {/* Main Content */}
          <section className="lg:col-span-3">
            {/* Search Input */}
            <div className="mb-6">
              <label htmlFor="search" className="sr-only">
                البحث عن الدروس
              </label>
              <Input
                id="search"
                type="text"
                placeholder="ابحث عن درس..."
                value={state.searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                dir="rtl"
                lang="ar"
                aria-label="البحث عن الدروس"
              />
              {state.searchQuery.length > 0 && state.searchQuery.length < 2 && (
                <p className="mt-2 text-sm text-warning">
                  يرجى إدخال حرفين على الأقل
                </p>
              )}
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            )}

            {/* Error State */}
            {isError && (
              <div className="rounded-lg border border-error bg-surface-card p-6">
                <p className="text-error mb-4">خطأ في تحميل الدروس</p>
                <Button onClick={() => filteredQuery.refetch()}>
                  إعادة المحاولة
                </Button>
              </div>
            )}

            {/* Empty State */}
            {isEmpty && !isLoading && !isError && (
              <div className="text-center py-12 rounded-lg border border-border bg-surface-card p-6">
                <p className="text-lg text-text-secondary mb-4">
                  لا توجد دروس مطابقة
                </p>
                <p className="text-text-secondary mb-6">
                  ഉയർപ്പെടുത്തിയ കോഴ്സുകൾ ഇല്ല
                </p>
                <Button onClick={handleReset} variant="ghost">
                  إعادة تعيين الفلاتر
                </Button>
              </div>
            )}

            {/* Lesson List */}
            {!isLoading && !isError && lessons.length > 0 && (
              <>
                <ul className="rounded-lg border border-border divide-y divide-border bg-surface-card overflow-hidden">
                  {lessons.map((lesson, index) => (
                    <LessonCard
                      key={lesson.id}
                      lesson={lesson}
                      ref={index === 0 ? firstLessonRef : undefined}
                    />
                  ))}
                </ul>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8">
                    <Pagination
                      currentPage={state.currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
