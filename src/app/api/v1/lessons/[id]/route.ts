import { NextRequest, NextResponse } from "next/server";
import { LessonIdSchema } from "@/schemas/lesson-query.schema";
import { buildError } from "@/utils/response";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const params = await context.params;
  const parsed = LessonIdSchema.safeParse(params.id);

  if (!parsed.success) {
    return NextResponse.json(
      buildError("BAD_REQUEST", "ID is not a valid integer", {
        id: parsed.error.issues[0]?.message ?? "id must be a positive integer",
      }),
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
