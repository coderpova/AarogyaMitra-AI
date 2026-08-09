import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(request: NextRequest) {
  try {
    const oauthToken = request.cookies.get("oauth_token")?.value;
    if (!oauthToken) {
      return NextResponse.json({ message: "No session found" }, { status: 401 });
    }

    const decoded: any = jwt.verify(oauthToken, JWT_SECRET);

    await connectDB();
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const response = NextResponse.json({
      token: oauthToken,
      user: {
        name: user.name,
        email: user.email,
        gmailConnected: user.gmail?.connected || false,
      },
    });

    // Clear the oauth_token cookie
    response.cookies.delete("oauth_token");

    return response;
  } catch (error) {
    console.error("Session fetch error:", error);
    return NextResponse.json({ message: "Invalid session" }, { status: 401 });
  }
}
