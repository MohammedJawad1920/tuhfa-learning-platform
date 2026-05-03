import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/config/env";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

function createLimiter(
  prefix: string,
  requests: number,
  window: Parameters<typeof Ratelimit.slidingWindow>[1],
) {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix,
  });
}

export const publicRateLimit = createLimiter("rl:public", 120, "1 m");
export const authRateLimit = createLimiter("rl:auth", 5, "15 m");
export const adminWriteRateLimit = createLimiter("rl:admin-write", 60, "1 m");
export const uploadRateLimit = createLimiter("rl:upload", 10, "1 h");

export function getClientIp(
  headers: Headers | Record<string, string | undefined>,
): string {
  const forwardedFor =
    headers instanceof Headers
      ? headers.get("x-forwarded-for")
      : headers["x-forwarded-for"];

  const ip = forwardedFor?.split(",")[0]?.trim();
  return ip && ip.length > 0 ? ip : "127.0.0.1";
}

export async function checkPublicRateLimit(
  headers: Headers | Record<string, string | undefined>,
) {
  return publicRateLimit.limit(getClientIp(headers));
}

export async function checkAuthRateLimit(
  headers: Headers | Record<string, string | undefined>,
) {
  return authRateLimit.limit(getClientIp(headers));
}

export async function checkAdminWriteRateLimit(
  headers: Headers | Record<string, string | undefined>,
) {
  return adminWriteRateLimit.limit(getClientIp(headers));
}

export async function checkUploadRateLimit(
  headers: Headers | Record<string, string | undefined>,
) {
  return uploadRateLimit.limit(getClientIp(headers));
}

export default {
  publicRateLimit,
  authRateLimit,
  adminWriteRateLimit,
  uploadRateLimit,
  getClientIp,
  checkPublicRateLimit,
  checkAuthRateLimit,
  checkAdminWriteRateLimit,
  checkUploadRateLimit,
};
