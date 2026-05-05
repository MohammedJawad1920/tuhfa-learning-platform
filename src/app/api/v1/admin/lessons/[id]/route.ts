import { NextResponse } from "next/server";

import { buildError } from "@/utils/response";

export async function PUT() {
  return NextResponse.json(
    buildError(
      "NOT_IMPLEMENTED",
      "PUT /api/v1/admin/lessons/[id] is not implemented yet",
      {},
    ),
    { status: 501 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    buildError(
      "NOT_IMPLEMENTED",
      "DELETE /api/v1/admin/lessons/[id] is not implemented yet",
      {},
    ),
    { status: 501 },
  );
}
