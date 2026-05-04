import { Lesson } from "@/types/lesson";

export type FilterOptions = {
  volume?: number;
  kitab?: string;
  bab?: string;
  search?: string;
};

export type PaginationOptions = {
  limit: number;
  offset: number;
};

export function filterLessons(
  lessons: Lesson[],
  filters: FilterOptions,
): Lesson[] {
  return lessons.filter((lesson) => {
    if (filters.volume !== undefined && lesson.volume !== filters.volume) {
      return false;
    }

    if (filters.kitab !== undefined && lesson.chapter.kitab !== filters.kitab) {
      return false;
    }

    if (filters.bab !== undefined && lesson.chapter.bab !== filters.bab) {
      return false;
    }

    if (
      filters.search !== undefined &&
      !lesson.title_ar.includes(filters.search)
    ) {
      return false;
    }

    return true;
  });
}

export function paginateLessons(
  lessons: Lesson[],
  options: PaginationOptions,
): Lesson[] {
  const { limit, offset } = options;
  return lessons.slice(offset, offset + limit);
}

export function filterAndPaginate(
  lessons: Lesson[],
  filters: FilterOptions,
  pagination: PaginationOptions,
): { filtered: Lesson[]; paginated: Lesson[] } {
  const filtered = filterLessons(lessons, filters);
  const paginated = paginateLessons(filtered, pagination);
  return { filtered, paginated };
}

export default { filterLessons, paginateLessons, filterAndPaginate };
