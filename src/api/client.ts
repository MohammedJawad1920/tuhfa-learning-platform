import type { operations } from "../types/api";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";

type FetchError = Error & {
  status: number;
  body: unknown;
};

function buildQuery(params: Record<string, unknown> | undefined): string {
  if (!params) return "";
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    )
    .join("&");
  return qs ? `?${qs}` : "";
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${BASE}${path}`;
  const headers = new Headers(init?.headers as HeadersInit | undefined);
  if (init?.body && !(init.body instanceof FormData)) {
    if (!headers.has("Content-Type"))
      headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { credentials: "include", ...init, headers });
  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as FetchError;
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json as T;
}

export type ListLessonsResponse =
  operations["listLessons"]["responses"][200]["content"]["application/json"];
export type GetLessonByIdResponse =
  operations["getLessonById"]["responses"][200]["content"]["application/json"];
export type AdminAuthResponse =
  operations["adminAuth"]["responses"][200]["content"]["application/json"];
export type CreateLessonResponse =
  operations["createLesson"]["responses"][201]["content"]["application/json"];
export type UpdateLessonResponse =
  operations["updateLesson"]["responses"][200]["content"]["application/json"];
export type PresignUploadResponse = {
  data: {
    presigned_url: string;
    archive_url: string;
    filename: string;
    expires_in: number;
    method: "PUT";
    required_headers: { "Content-Type": string };
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
};

export function queryString(params?: Record<string, unknown>) {
  return buildQuery(params);
}

export default {
  apiFetch,
  queryString,
};
