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

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");

  if (!secret || !compareSecret(secret, env.REVALIDATION_SECRET)) {
    return NextResponse.json(
      buildError("UNAUTHORIZED", "Invalid revalidation secret", {}),
      { status: 401 },
    );
  }

  try {
    revalidateTag("lessons", {});
  } catch {
    // Silently ignore revalidation errors; the cache tag may not exist yet
  }

  return NextResponse.json(buildSuccess({ revalidated: true }), {
    status: 200,
  });
}
