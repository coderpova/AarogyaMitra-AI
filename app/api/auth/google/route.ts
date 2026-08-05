import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/googleAuth";

export async function GET() {
  try {
    const url = getGoogleAuthUrl();
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.redirect(
      new URL("/login?error=google_not_configured", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    );
  }
}
