import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";

import { env } from "@/config/env";
import { AuthSchema } from "@/schemas/auth.schema";
import { buildError, buildSuccess } from "@/utils/response";
import { logger } from "@/lib/logger";
import { sessionOptions } from "@/config/session";

type AdminSession = {
  authenticated?: boolean;
  createdAt?: number;
};

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

function getAllowedOrigins() {
  return env.ALLOWED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function applyCorsHeaders(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return response;
  }

  const allowedOrigins = new Set(getAllowedOrigins());
  if (!allowedOrigins.has(origin)) {
    // Log diagnostic info so we can see why CORS was not applied
    try {
      logger.warn(
        {
          route: "/api/v1/admin/auth",
          origin,
          allowedOrigins: Array.from(allowedOrigins),
        },
        "CORS origin not allowed",
      );
    } catch (err) {
      // ignore
    }

    // Provide minimal debug headers so we can inspect runtime env from responses
    try {
      response.headers.set("x-debug-origin", origin);
      response.headers.set(
        "x-debug-allowed-origins",
        getAllowedOrigins().join(","),
      );
    } catch (err) {
      // ignore
    }

    return response;
  }

  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Vary", "Origin");

  // Diagnostic headers to help debug production CORS issues
  try {
    response.headers.set("x-debug-origin", origin);
    response.headers.set(
      "x-debug-allowed-origins",
      getAllowedOrigins().join(","),
    );
  } catch (err) {
    // ignore
  }

  return response;
}

export async function OPTIONS(request: NextRequest) {
  try {
    logger.info(
      {
        route: "/api/v1/admin/auth",
        method: "OPTIONS",
        origin: request.headers.get("origin") || "",
      },
      "auth options",
    );
  } catch (err) {
    // ignore
  }
  return applyCorsHeaders(new NextResponse(null, { status: 204 }), request);
}

export async function POST(request: NextRequest) {
  try {
    logger.info(
      {
        route: "/api/v1/admin/auth",
        method: "POST",
        origin: request.headers.get("origin") || "",
      },
      "auth POST",
    );
  } catch (err) {
    // ignore
  }
  // Check auth rate limit before processing body
  const rateLimitModule = await import("@/lib/rate-limit");
  const rateLimitResult = await rateLimitModule.checkAuthRateLimit(
    request.headers,
  );

  if (!rateLimitResult.success) {
    const retryAfterSeconds = getRetryAfterSeconds(rateLimitResult.reset);

    return applyCorsHeaders(
      NextResponse.json(
        buildError(
          "RATE_LIMITED",
          "Too many requests. Please try again later.",
          {
            retryAfterSeconds,
          },
        ),
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds) },
        },
      ),
      request,
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return applyCorsHeaders(
      NextResponse.json(buildError("BAD_REQUEST", "Invalid JSON body", {}), {
        status: 400,
      }),
      request,
    );
  }

  const parsed = AuthSchema.safeParse(body);

  if (!parsed.success) {
    return applyCorsHeaders(
      NextResponse.json(
        buildError(
          "VALIDATION_ERROR",
          "Validation failed",
          buildValidationDetails(parsed.error.issues),
        ),
        { status: 422 },
      ),
      request,
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

    return applyCorsHeaders(
      NextResponse.json(
        buildError("INVALID_CREDENTIALS", "Invalid credentials", {}),
        { status: 401 },
      ),
      request,
    );
  }

  // Create session on successful auth
  const response = applyCorsHeaders(
    NextResponse.json(buildSuccess({ authenticated: true }), {
      status: 200,
    }),
    request,
  );
  const session = await getIronSession<AdminSession>(
    request,
    response,
    sessionOptions,
  );
  session.authenticated = true;
  session.createdAt = Date.now();
  await session.save();

  logger.info(
    { route: "/api/v1/admin/auth", method: "POST", statusCode: 200 },
    "Admin authenticated",
  );

  return response;
}
