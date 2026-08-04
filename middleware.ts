import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  const protectedRoutes = [
    "/dashboard",
    "/profile",
    "/settings",
    "/chat",
    "/hospital",
    "/medicines",
    "/appointments",
    "/schemes",
    "/report-analyzer",
  ];

  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/chat/:path*",
    "/hospital/:path*",
    "/medicines/:path*",
    "/appointments/:path*",
    "/schemes/:path*",
    "/report-analyzer/:path*",
  ],
};
