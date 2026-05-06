import { Button } from "@/components/ui/Button";
import { formatDate, formatDuration } from "@/lib/format";
import type { Lesson } from "@/types/lesson";

type AdminLessonTableProps = {
  lessons: Lesson[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
};

export function AdminLessonTable({
  lessons,
  onEdit,
  onDelete,
}: AdminLessonTableProps) {
  return (
    <table className="min-w-full border-separate border-spacing-0">
      <caption className="sr-only">قائمة الدروس الإدارية</caption>
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-text-secondary">
          <th scope="col" className="border-b border-border px-4 py-3">
            المجلد
          </th>
          <th scope="col" className="border-b border-border px-4 py-3">
            رقم الدرس
          </th>
          <th scope="col" className="border-b border-border px-4 py-3">
            العنوان العربي
          </th>
          <th scope="col" className="border-b border-border px-4 py-3">
            الكتاب
          </th>
          <th scope="col" className="border-b border-border px-4 py-3">
            المدة
          </th>
          <th scope="col" className="border-b border-border px-4 py-3">
            تاريخ الرفع
          </th>
          <th scope="col" className="border-b border-border px-4 py-3">
            الإجراءات
          </th>
        </tr>
      </thead>
      <tbody>
        {lessons.map((lesson) => (
          <tr key={lesson.id} className="align-top odd:bg-surface-card">
            <td className="border-b border-border px-4 py-3 text-sm text-text-primary">
              {lesson.volume}
            </td>
            <td className="border-b border-border px-4 py-3 text-sm text-text-primary">
              {lesson.lesson_number}
            </td>
            <td className="border-b border-border px-4 py-3 text-sm text-text-primary">
              <span dir="rtl" lang="ar" className="block max-w-[28rem]">
                {lesson.title_ar}
              </span>
            </td>
            <td className="border-b border-border px-4 py-3 text-sm text-text-primary">
              <span dir="rtl" lang="ar" className="block max-w-[20rem]">
                {lesson.chapter.kitab}
              </span>
            </td>
            <td className="border-b border-border px-4 py-3 text-sm text-text-primary">
              {formatDuration(lesson.duration_seconds)}
            </td>
            <td className="border-b border-border px-4 py-3 text-sm text-text-primary">
              {formatDate(lesson.upload_date)}
            </td>
            <td className="border-b border-border px-4 py-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onEdit(lesson.id)}
                  aria-label={`تعديل الدرس ${lesson.id}`}
                >
                  تعديل
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => onDelete(lesson.id)}
                  aria-label={`حذف الدرس ${lesson.id}`}
                >
                  حذف
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default AdminLessonTable;
