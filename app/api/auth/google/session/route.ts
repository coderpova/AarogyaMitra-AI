import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

function parseCookieHeader(header: string | null): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  header.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const val = parts.slice(1).join("=").trim();
      cookies[name] = val;
    }
  });
  return cookies;
}

export async function GET(request: NextRequest) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("Critical Server Error: JWT_SECRET environment variable is missing.");
    return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
  }

  // Precedence 1 & 2: Next.js request.cookies lookup
  const reqOauthToken = request.cookies.get("oauth_token")?.value;
  const reqToken = request.cookies.get("token")?.value;

  // Precedence 3 & 4: Raw Cookie header fallback
  const rawCookieHeader = request.headers.get("cookie");
  const parsedCookies = parseCookieHeader(rawCookieHeader);
  const rawOauthToken = parsedCookies["oauth_token"];
  const rawToken = parsedCookies["token"];

  const oauthToken = reqOauthToken || reqToken || rawOauthToken || rawToken;

  if (!oauthToken) {
    return NextResponse.json({ message: "No session cookie found" }, { status: 401 });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(oauthToken, jwtSecret);
  } catch (err) {
    console.error("Session JWT verification failed:", err instanceof Error ? err.message : "Invalid token");
    return NextResponse.json({ message: "Invalid or expired session token" }, { status: 401 });
  }

  let user: any;
  try {
    await connectDB();
    user = await User.findById(decoded.userId);
  } catch (err) {
    console.error("Database connection failure in session handler:", err instanceof Error ? err.message : "DB Error");
    return NextResponse.json({ message: "Database connection error" }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const response = NextResponse.json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      gmailConnected: user.gmail?.connected || false,
    },
  });

  const isProduction = process.env.NODE_ENV === "production" || request.nextUrl.protocol === "https:";

  // Ensure primary HttpOnly session cookie remains active
  response.cookies.set("token", oauthToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  // Clear temporary exchange cookie if present
  if (reqOauthToken || rawOauthToken) {
    response.cookies.delete("oauth_token");
  }

  return response;
}
