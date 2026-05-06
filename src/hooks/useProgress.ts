import { useCallback, useRef } from "react";
import type { LessonProgress, ProgressStore } from "@/types/progress";

const STORAGE_KEY = "tuhfa_progress";
const THROTTLE_MS = 5000;

export function useProgress() {
  const lastSaveRef = useRef<Record<number, number>>({});

  const getProgress = useCallback((lessonId: number): LessonProgress | null => {
    try {
      if (typeof window === "undefined") return null;
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const store: ProgressStore = JSON.parse(stored);
      return store[lessonId] || null;
    } catch {
      return null;
    }
  }, []);

  const savePosition = useCallback(
    (lessonId: number, positionSeconds: number) => {
      try {
        if (typeof window === "undefined") return;

        // Throttle: don't save more than once every THROTTLE_MS
        const now = Date.now();
        const lastSave = lastSaveRef.current[lessonId] || 0;
        if (now - lastSave < THROTTLE_MS) {
          return;
        }
        lastSaveRef.current[lessonId] = now;

        const stored = localStorage.getItem(STORAGE_KEY) || "{}";
        const store: ProgressStore = JSON.parse(stored);

        store[lessonId] = {
          completed: store[lessonId]?.completed ?? false,
          positionSeconds,
          lastPlayedAt: new Date().toISOString(),
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      } catch {
        // Silently fail if localStorage is unavailable
      }
    },
    [],
  );

  const markComplete = useCallback((lessonId: number) => {
    try {
      if (typeof window === "undefined") return;

      const stored = localStorage.getItem(STORAGE_KEY) || "{}";
      const store: ProgressStore = JSON.parse(stored);

      store[lessonId] = {
        completed: true,
        positionSeconds: store[lessonId]?.positionSeconds ?? 0,
        lastPlayedAt: store[lessonId]?.lastPlayedAt ?? new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, []);

  return { getProgress, savePosition, markComplete };
}
