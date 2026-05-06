import { LessonDetail } from "@/features/lessons/LessonDetail";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonPage({ params }: PageProps) {
  const { id } = await params;
  const lessonId = parseInt(id, 10);

  if (!Number.isFinite(lessonId) || lessonId <= 0) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface px-4">
        <div className="rounded-lg border border-error bg-surface-card p-8 text-center max-w-md">
          <p className="text-lg text-error">معرف الدرس غير صحيح</p>
        </div>
      </main>
    );
  }

  return <LessonDetail lessonId={lessonId} />;
}
