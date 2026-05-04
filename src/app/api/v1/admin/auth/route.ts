import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { env } from "@/config/env";
import { AuthSchema } from "@/schemas/auth.schema";
import { buildError, buildSuccess } from "@/utils/response";

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
    return NextResponse.json(
      buildError("INVALID_CREDENTIALS", "Invalid credentials", {}),
      { status: 401 },
    );
  }

  return NextResponse.json(buildSuccess({ authenticated: true }), {
    status: 200,
  });
}
