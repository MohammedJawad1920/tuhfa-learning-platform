import { useQuery } from "@tanstack/react-query";
import * as endpoints from "@/api/endpoints";
import { mergeLessonPages } from "@/lib/lessons";
import type { Lesson } from "@/types/lesson";
import type { ListLessonsResponse } from "@/api/client";

export function useAllLessons() {
  return useQuery<Lesson[], Error>({
    queryKey: ["lessons", "all"],
    queryFn: async () => {
      const limit = 200;
      const offsets = [0, 200, 400, 600];
      const promises = offsets.map((offset) =>
        endpoints.listLessons({ limit, offset }),
      );

      const pages = await Promise.all(promises);
      const lessonsPages = pages.map(
        (p: ListLessonsResponse) => p.data?.lessons ?? [],
      );
      return mergeLessonPages(lessonsPages);
    },
    staleTime: 60_000,
  });
}

export type FilterParams = {
  volume?: 1 | 2 | 3 | 4;
  kitab?: string;
  bab?: string;
  fasl?: string;
  search?: string;
};

export function useFilteredLessons(
  filters?: FilterParams,
  page = 1,
  limit = 50,
) {
  return useQuery<{ lessons: Lesson[]; total: number }, Error>({
    queryKey: ["lessons", "filtered", filters ?? {}, page],
    queryFn: async () => {
      const offset = Math.max(0, (page - 1) * limit);
      const resp = await endpoints.listLessons({
        ...filters,
        limit,
        offset,
      });
      return {
        lessons: resp.data?.lessons ?? [],
        total: resp.meta?.total ?? 0,
      };
    },
    staleTime: 60_000,
  });
}

export default { useAllLessons, useFilteredLessons };
