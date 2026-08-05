import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getOAuth2Client, getAppUrl } from "@/lib/googleAuth";

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/login?error=google_auth_failed`);
  }

  try {
    await connectDB();
    const client = getOAuth2Client();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return NextResponse.redirect(`${appUrl}/login?error=google_no_email`);
    }

    const { email, name, sub: googleId, picture } = payload;
    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = await bcrypt.hash(googleId + Date.now(), 10);
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        password: randomPassword,
        googleId,
        authProvider: "google",
        gmail: {
          accessToken: tokens.access_token || "",
          refreshToken: tokens.refresh_token || "",
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          connected: true,
          lastSync: new Date(),
        },
      });
    } else {
      user.googleId = googleId;
      user.authProvider = user.authProvider || "google";
      user.gmail = {
        accessToken: tokens.access_token || user.gmail?.accessToken || "",
        refreshToken: tokens.refresh_token || user.gmail?.refreshToken || "",
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : user.gmail?.tokenExpiry,
        connected: true,
        lastSync: new Date(),
      };
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    const params = new URLSearchParams({
      token,
      name: user.name,
      email: user.email,
      gmail: "true",
      ...(picture ? { picture } : {}),
    });

    return NextResponse.redirect(`${appUrl}/auth/google-success?${params.toString()}`);
  } catch (err) {
    console.error("Google callback error:", err);
    return NextResponse.redirect(`${appUrl}/login?error=google_callback_failed`);
  }
}
