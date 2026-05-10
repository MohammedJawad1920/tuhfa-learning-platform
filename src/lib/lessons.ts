import type { Lesson } from "@/types/lesson";

export function mergeLessonPages(pages: Lesson[][]): Lesson[] {
  const map = new Map<number, Lesson>();
  for (const page of pages) {
    for (const lesson of page) {
      map.set(lesson.id, lesson);
    }
  }

  const merged = Array.from(map.values());
  merged.sort((a, b) => {
    if (a.volume === b.volume) {
      return a.lesson_number - b.lesson_number;
    }
    return a.volume - b.volume;
  });

  return merged;
}

export type ChapterHierarchy = Record<
  number,
  Record<string, Record<string, number[]>>
>;

export function buildChapterHierarchy(lessons: Lesson[]): ChapterHierarchy {
  const tree: Record<number, Record<string, Record<string, Set<number>>>> = {};

  for (const l of lessons) {
    const vol = l.volume;
    const kitab = l.chapter?.kitab ?? "";
    const bab = l.chapter?.bab ?? "";

    if (!tree[vol]) tree[vol] = {};
    if (!tree[vol][kitab]) tree[vol][kitab] = {};
    if (!tree[vol][kitab][bab]) tree[vol][kitab][bab] = new Set<number>();

    tree[vol][kitab][bab].add(l.id);
  }

  // convert sets to sorted arrays
  const out: ChapterHierarchy = {};
  for (const volStr of Object.keys(tree)) {
    const vol = Number(volStr);
    out[vol] = {};
    for (const kitab of Object.keys(tree[vol])) {
      out[vol][kitab] = {};
      for (const bab of Object.keys(tree[vol][kitab])) {
        out[vol][kitab][bab] = Array.from(tree[vol][kitab][bab]).sort(
          (a, b) => a - b,
        );
      }
    }
  }

  return out;
}

export type FilterOptions = {
  volume?: number;
  kitab?: string;
  bab?: string;
  fasl?: string;
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

    if (filters.fasl !== undefined && lesson.chapter.fasl !== filters.fasl) {
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
