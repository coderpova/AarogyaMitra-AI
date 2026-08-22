import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Chat from "@/models/chat";
import jwt from "jsonwebtoken";

/**
 * POST /api/chat/sync
 * Accepts offline chat messages and saves them to the database.
 * Called by SyncManager when internet is restored.
 */
export async function POST(req: Request) {
  try {
    const { message, reply, timestamp, conversationId, title } = await req.json();

    if (!message || !reply) {
      return NextResponse.json(
        { message: "message and reply are required" },
        { status: 400 }
      );
    }

    let authenticatedUserId = null;
    const authHeader = req.headers.get("authorization");
    let token = authHeader ? authHeader.split(" ")[1] : null;

    if (!token) {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/(?:^|;)\s*token\s*=\s*([^;]+)/);
      token = match ? match[1] : null;
    }

    if (token) {
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        authenticatedUserId = decoded.userId;
      } catch (err) {
        // invalid token
      }
    }

    if (!authenticatedUserId) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    await connectDB();

    await Chat.create({
      userId: authenticatedUserId,
      message,
      reply,
      conversationId: conversationId || undefined,
      title: title || undefined,
      createdAt: timestamp ? new Date(timestamp) : new Date()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CHAT SYNC ERROR:", error);
    return NextResponse.json(
      { message: "Sync failed" },
      { status: 500 }
    );
  }
}
