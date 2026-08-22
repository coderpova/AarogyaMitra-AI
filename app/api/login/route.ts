// frontend/app/api/login/route.ts
// Hardened login route with JWT helper, rate limiting, payload validation, and structured logging
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import logger from "@/lib/logger";
import { signJwt } from "@/lib/jwtHelper";
import { enforceRequestSize } from "@/lib/requestSizeValidator";
import { rateLimit } from "@/lib/rateLimiter";

export async function POST(request: Request) {
  // Rate limiting per IP (serverless, best‑effort)
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit("login", ip);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: "TOO_MANY_REQUESTS", message: "Rate limit exceeded" }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  // Enforce payload size (5 MB)
  const sizeResp = await enforceRequestSize(request, 5 * 1024 * 1024);
  if (sizeResp) return sizeResp;

  try {
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;
    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      logger.warn("Login attempt with missing credentials");
      return NextResponse.json({ error: "BAD_REQUEST", message: "Please enter both email and password." }, { status: 400 });
    }
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user || !user.password) {
      // Generic error to avoid enumeration
      logger.info("Failed login for non‑existent user", { email: cleanEmail });
      return NextResponse.json({ error: "UNAUTHORIZED", message: "Invalid email or password" }, { status: 401 });
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      logger.info("Failed login due to wrong password", { userId: user._id.toString() });
      return NextResponse.json({ error: "UNAUTHORIZED", message: "Invalid email or password" }, { status: 401 });
    }
    const token = signJwt({ userId: user._id.toString(), email: user.email });
    const response = NextResponse.json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        settings: user.settings || {},
        gmailConnected: user.gmail?.connected || false,
      },
    }, { status: 200 });
    // Set HttpOnly cookie for session security
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    logger.info("User logged in", { userId: user._id.toString() });
    return response;
  } catch (error) {
    logger.error("Login API Error", { error });
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" }, { status: 500 });
  }
}