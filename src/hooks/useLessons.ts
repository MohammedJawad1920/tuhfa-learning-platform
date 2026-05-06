import { useQuery } from "@tanstack/react-query";
import * as endpoints from "@/api/endpoints";
import { mergeLessonPages } from "@/lib/lessons";
import type { Lesson } from "@/types/lesson";

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
      const lessonsPages = pages.map((p) => (p as any).data?.lessons ?? []);
      return mergeLessonPages(lessonsPages);
    },
    staleTime: 60_000,
  });
}

export type FilterParams = {
  volume?: 1 | 2 | 3 | 4;
  kitab?: string;
  bab?: string;
  search?: string;
};

export function useFilteredLessons(filters?: FilterParams, page = 1, limit = 50) {
  return useQuery<Lesson[], Error>({
    queryKey: ["lessons", "filtered", filters ?? {}, page],
    queryFn: async () => {
      const offset = Math.max(0, (page - 1) * limit);
      const resp = await endpoints.listLessons({ ...filters, limit, offset } as any);
      return (resp as any).data?.lessons ?? [];
    },
    staleTime: 60_000,
  });
}

export default { useAllLessons, useFilteredLessons };
