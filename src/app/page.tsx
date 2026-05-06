import { LessonBrowser } from "@/features/lessons/LessonBrowser";

export const revalidate = 60;

export default function Home() {
  return <LessonBrowser />;
}
