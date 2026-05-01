import { components } from "@/types/api";
import { generateRequestId } from "@/utils/request-id";

export type ApiError = components["schemas"]["ApiError"];
export type ResponseMeta = components["schemas"]["ResponseMeta"];

export type ApiResponse<T> = {
  data: T;
  meta: ResponseMeta;
};

export function nowIso(): string {
  return new Date().toISOString();
}

type MetaFor<T> = ApiResponse<T>["meta"];

export function buildSuccess<T>(
  data: T,
  meta?: Partial<MetaFor<T>>,
): ApiResponse<T> {
  const baseMeta = {
    requestId: generateRequestId(),
    timestamp: nowIso(),
  } as MetaFor<T>;

  return {
    data,
    meta: { ...baseMeta, ...(meta || {}) },
  };
}

export function buildError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ApiError {
  return {
    error: { code, message, details },
    requestId: generateRequestId(),
    timestamp: nowIso(),
  };
}

export default buildSuccess;
