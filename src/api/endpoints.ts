import client, {
  apiFetch,
  ListLessonsResponse,
  GetLessonByIdResponse,
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
  return await apiFetch<any>(`/admin/auth`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function createLesson(body: unknown) {
  return await apiFetch<any>(`/admin/lessons`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateLesson(id: number, body: unknown) {
  return await apiFetch<any>(`/admin/lessons/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteLesson(id: number) {
  return await apiFetch<any>(`/admin/lessons/${id}`, { method: "DELETE" });
}

export async function uploadAudio(form: FormData) {
  return await apiFetch<any>(`/admin/upload`, { method: "POST", body: form });
}

export default {
  listLessons,
  getLessonById,
  adminAuth,
  createLesson,
  updateLesson,
  deleteLesson,
  uploadAudio,
};
