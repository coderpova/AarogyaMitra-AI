import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getOAuth2Client } from "@/lib/googleAuth";

const HEALTH_KEYWORDS = [
  "health", "medical", "doctor", "hospital", "prescription", "lab", "report",
  "medicine", "appointment", "diagnosis", "blood", "test", "pharmacy", "clinic",
];

function decodeUserId(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") || request.cookies.get("token")?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

async function gmailFetch(accessToken: string, url: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);
  return res.json();
}

export async function GET(request: NextRequest) {
  try {
    const userId = decodeUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(userId);
    if (!user?.gmail?.connected || !user.gmail.refreshToken) {
      return NextResponse.json(
        { message: "Gmail not connected", connected: false },
        { status: 400 }
      );
    }

    const client = getOAuth2Client();
    client.setCredentials({
      access_token: user.gmail.accessToken,
      refresh_token: user.gmail.refreshToken,
      expiry_date: user.gmail.tokenExpiry?.getTime(),
    });

    let accessToken = user.gmail.accessToken;

    if (!user.gmail.tokenExpiry || user.gmail.tokenExpiry < new Date()) {
      const { credentials } = await client.refreshAccessToken();
      accessToken = credentials.access_token!;
      user.gmail.accessToken = accessToken;
      user.gmail.tokenExpiry = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000);
      await user.save();
    }

    const listData = await gmailFetch(
      accessToken,
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=health OR medical OR doctor OR hospital OR prescription OR lab OR report"
    );

    const messageIds: { id: string }[] = listData.messages || [];
    const messages = [];

    for (const msg of messageIds.slice(0, 10)) {
      try {
        const detail = await gmailFetch(
          accessToken,
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`
        );

        const headerList: { name: string; value: string }[] = detail.payload?.headers || [];
        const getHeader = (name: string) =>
          headerList.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

        const subject = getHeader("Subject");
        const from = getHeader("From");
        const date = getHeader("Date");
        const snippet: string = detail.snippet || "";

        const isHealthRelated = HEALTH_KEYWORDS.some(
          (kw) =>
            subject.toLowerCase().includes(kw) ||
            snippet.toLowerCase().includes(kw) ||
            from.toLowerCase().includes(kw)
        );

        if (isHealthRelated || messages.length < 5) {
          messages.push({ id: msg.id, subject, from, date, snippet });
        }
      } catch {
        // skip failed messages
      }
    }

    user.gmail.lastSync = new Date();
    await user.save();

    return NextResponse.json({
      connected: true,
      lastSync: user.gmail.lastSync,
      count: messages.length,
      messages,
    });
  } catch (error) {
    console.error("Gmail fetch error:", error);
    return NextResponse.json({ message: "Failed to fetch Gmail data" }, { status: 500 });
  }
}
