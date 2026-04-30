export type Volume = 1 | 2 | 3 | 4;

export type Chapter = {
  kitab: string;
  bab: string | null;
  fasl: string | null;
};

export type Lesson = {
  id: number;
  volume: Volume;
  lesson_number: number;
  title_ar: string;
  chapter: Chapter;
  duration_seconds: number;
  upload_date: string;
  archive_url: string;
  telegram_post_id: number;
};

export type LessonCreateBody = {
  volume: Volume;
  lesson_number: number;
  title_ar: string;
  chapter: Chapter;
  duration_seconds: number;
  upload_date: string;
  archive_url: string;
  telegram_post_id: number;
};

export type LessonUpdateBody = {
  title_ar?: string;
  chapter?: Chapter;
  duration_seconds?: number;
  upload_date?: string;
  archive_url?: string;
  telegram_post_id?: number;
};

export type LessonsFile = {
  version: number;
  last_updated: string;
  lessons: Lesson[];
};
