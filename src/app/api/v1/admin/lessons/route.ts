import { NextResponse } from "next/server";

import { buildError } from "@/utils/response";

export async function POST() {
  return NextResponse.json(
    buildError(
      "NOT_IMPLEMENTED",
      "POST /api/v1/admin/lessons is not implemented yet",
      {},
    ),
    { status: 501 },
  );
}
