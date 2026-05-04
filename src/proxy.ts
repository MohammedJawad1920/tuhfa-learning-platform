import { getIronSession } from "iron-session";
import { NextRequest, NextResponse } from "next/server";

import { env } from "@/config/env";
import { sessionOptions } from "@/config/session";
import { buildError } from "@/utils/response";

type AdminSession = {
  authenticated?: boolean;
  createdAt?: number;
};

function getSessionExpiryMs(): number {
  return env.SESSION_MAX_AGE_SECONDS * 1000;
}

function isAdminApiPath(pathname: string) {
  return (
    pathname.startsWith("/api/v1/admin/") && pathname !== "/api/v1/admin/auth"
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    if (!isAdminApiPath(pathname)) {
      return NextResponse.next();
    }

    const response = NextResponse.next();
    const session = await getIronSession<AdminSession>(
      request,
      response,
      sessionOptions,
    );

    if (
      session.authenticated !== true ||
      typeof session.createdAt !== "number" ||
      Date.now() - session.createdAt > getSessionExpiryMs()
    ) {
      return NextResponse.json(
        buildError("UNAUTHORIZED", "Authentication required", {}),
        { status: 401 },
      );
    }

    return response;
  }

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("tuhfa_session");

  if (!sessionCookie?.value) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/v1/admin/:path*"],
};
