import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { env } from "@/config/env";
import { buildError, buildSuccess } from "@/utils/response";

function toPaddedBuffer(value: string, targetLength: number) {
  const buffer = Buffer.alloc(targetLength);
  buffer.write(value);
  return buffer;
}

function compareSecret(input: string, expected: string): boolean {
  const length = Math.max(
    Buffer.byteLength(input),
    Buffer.byteLength(expected),
  );
  const inputBuffer = toPaddedBuffer(input, length);
  const expectedBuffer = toPaddedBuffer(expected, length);

  return timingSafeEqual(inputBuffer, expectedBuffer);
}

function isValidNonce(nonce: string | null): boolean {
  if (!nonce) return false;

  const parsed = Number.parseInt(nonce, 10);
  if (!Number.isFinite(parsed)) return false;

  return Date.now() - parsed <= 60_000;
}

function unauthorized(message: string) {
  return NextResponse.json(buildError("UNAUTHORIZED", message, {}), {
    status: 401,
  });
}

function methodNotAllowed() {
  return NextResponse.json(
    buildError("METHOD_NOT_ALLOWED", "Method not allowed", {}),
    { status: 405 },
  );
}

export async function GET() {
  return methodNotAllowed();
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const nonceHeader = request.headers.get("x-revalidate-nonce");

  if (!authHeader?.startsWith("Bearer ")) {
    return unauthorized("Missing authorization header");
  }

  const token = authHeader.slice("Bearer ".length);
  if (!compareSecret(token, env.REVALIDATION_SECRET)) {
    return unauthorized("Invalid revalidation secret");
  }

  if (!isValidNonce(nonceHeader)) {
    return unauthorized("Invalid or expired revalidation nonce");
  }

  try {
    (revalidateTag as unknown as (tag: string) => void)("lessons");
  } catch {
    // Silently ignore revalidation errors; the cache tag may not exist yet
  }

  return NextResponse.json(buildSuccess({ revalidated: true }), {
    status: 200,
  });
}
