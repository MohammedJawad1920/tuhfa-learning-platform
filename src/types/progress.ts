export type LessonProgress = {
  completed: boolean;
  positionSeconds: number;
  lastPlayedAt: string;
};

export type ProgressStore = Record<number, LessonProgress>;
