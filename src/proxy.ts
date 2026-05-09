import { getIronSession } from "iron-session";
import { NextRequest, NextResponse } from "next/server";

import { env } from "@/config/env";
import { sessionOptions } from "@/config/session";
import { buildError } from "@/utils/response";
import { logger } from "@/lib/logger";

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
    return response;
  }

  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  response.headers.set("Vary", "Origin");

  // Diagnostic headers to help debug production CORS issues
  try {
    const originHeader = origin ?? "";
    response.headers.set("x-debug-origin", originHeader);
    response.headers.set(
      "x-debug-allowed-origins",
      getAllowedOrigins().join(","),
    );
  } catch (err) {
    // ignore
  }

  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Log basic request info for debugging CORS/method routing in production
  try {
    logger.info(
      {
        route: pathname,
        method: request.method,
        origin: request.headers.get("origin") || "",
      },
      "proxy request",
    );
  } catch (err) {
    // ignore logging errors
  }
  if (!pathname.startsWith("/admin")) {
    if (!pathname.startsWith("/api/v1/admin/")) {
      return NextResponse.next();
    }

    if (request.method === "OPTIONS") {
      return applyCorsHeaders(new NextResponse(null, { status: 204 }), request);
    }

    const response = applyCorsHeaders(NextResponse.next(), request);
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
      return applyCorsHeaders(
        NextResponse.json(
          buildError("UNAUTHORIZED", "Authentication required", {}),
          { status: 401 },
        ),
        request,
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
