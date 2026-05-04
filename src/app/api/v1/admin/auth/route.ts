import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { env } from "@/config/env";
import { AuthSchema } from "@/schemas/auth.schema";
import { buildError, buildSuccess } from "@/utils/response";
import { logger } from "@/lib/logger";

function getRetryAfterSeconds(reset: number): number {
  const resetMs = reset < 1_000_000_000_000 ? reset * 1000 : reset;
  return Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
}

function toPaddedBuffer(value: string, targetLength: number) {
  const buffer = Buffer.alloc(targetLength);
  buffer.write(value);
  return buffer;
}

function comparePassword(input: string, expected: string) {
  const length = Math.max(
    Buffer.byteLength(input),
    Buffer.byteLength(expected),
  );
  const inputBuffer = toPaddedBuffer(input, length);
  const expectedBuffer = toPaddedBuffer(expected, length);

  return timingSafeEqual(inputBuffer, expectedBuffer);
}

function buildValidationDetails(
  issues: { path: (string | number)[]; message: string }[],
) {
  return Object.fromEntries(
    issues.map((issue) => [issue.path.join("."), issue.message]),
  );
}

export async function POST(request: NextRequest) {
  // Check auth rate limit before processing body
  const rateLimitModule = await import("@/lib/rate-limit");
  const rateLimitResult = await rateLimitModule.checkAuthRateLimit(
    request.headers,
  );

  if (!rateLimitResult.success) {
    const retryAfterSeconds = getRetryAfterSeconds(rateLimitResult.reset);

    return NextResponse.json(
      buildError("RATE_LIMITED", "Too many requests. Please try again later.", {
        retryAfterSeconds,
      }),
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      buildError("BAD_REQUEST", "Invalid JSON body", {}),
      { status: 400 },
    );
  }

  const parsed = AuthSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      buildError(
        "VALIDATION_ERROR",
        "Validation failed",
        buildValidationDetails(parsed.error.issues),
      ),
      { status: 422 },
    );
  }

  const isValidPassword = comparePassword(
    parsed.data.password,
    env.ADMIN_PASSWORD,
  );

  if (!isValidPassword) {
    logger.warn(
      { route: "/api/v1/admin/auth", method: "POST", statusCode: 401 },
      "Invalid admin login attempt",
    );

    return NextResponse.json(
      buildError("INVALID_CREDENTIALS", "Invalid credentials", {}),
      { status: 401 },
    );
  }

  logger.info(
    { route: "/api/v1/admin/auth", method: "POST", statusCode: 200 },
    "Admin authenticated",
  );

  return NextResponse.json(buildSuccess({ authenticated: true }), {
    status: 200,
  });
}
