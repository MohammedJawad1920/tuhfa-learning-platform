import client, {
  apiFetch,
  ListLessonsResponse,
  GetLessonByIdResponse,
  AdminAuthResponse,
  CreateLessonResponse,
  UpdateLessonResponse,
  PresignUploadResponse,
} from "./client";

export type ListParams = {
  volume?: 1 | 2 | 3 | 4;
  kitab?: string;
  bab?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export async function listLessons(params?: ListParams) {
  const qs = client.queryString(params as Record<string, unknown>);
  return await apiFetch<ListLessonsResponse>(`/lessons${qs}`);
}

export async function getLessonById(id: number) {
  return await apiFetch<GetLessonByIdResponse>(`/lessons/${id}`);
}

export async function adminAuth(password: string) {
  return await apiFetch<AdminAuthResponse>(`/admin/auth`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function createLesson(body: unknown) {
  return await apiFetch<CreateLessonResponse>(`/admin/lessons`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateLesson(id: number, body: unknown) {
  return await apiFetch<UpdateLessonResponse>(`/admin/lessons/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteLesson(id: number) {
  return await apiFetch<UpdateLessonResponse>(`/admin/lessons/${id}`, {
    method: "DELETE",
  });
}

export async function presignUpload(data: {
  volume: number;
  lesson_number: number;
  content_type?: string;
}) {
  return await apiFetch<PresignUploadResponse>(`/admin/upload/presign`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export default {
  listLessons,
  getLessonById,
  adminAuth,
  createLesson,
  updateLesson,
  deleteLesson,
  presignUpload,
};
