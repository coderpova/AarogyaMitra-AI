import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Chat from "@/models/chat";

/**
 * POST /api/chat/sync
 * Accepts offline chat messages and saves them to the database.
 * Called by SyncManager when internet is restored.
 */
export async function POST(req: Request) {
  try {
    const { userId, message, reply, timestamp } = await req.json();

    if (!userId || !message || !reply) {
      return NextResponse.json(
        { message: "userId, message, and reply are required" },
        { status: 400 }
      );
    }

    await connectDB();

    await Chat.create({
      userId: userId || "guest",
      message,
      reply,
      createdAt: timestamp ? new Date(timestamp) : new Date()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("CHAT SYNC ERROR:", error);
    return NextResponse.json(
      { message: "Sync failed" },
      { status: 500 }
    );
  }
}
