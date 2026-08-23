import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Chat from "@/models/chat";
import { getAuthUserId, verifyJwt } from "@/lib/jwtHelper";

export async function POST(req: Request) {
  try {
    const { conversationId, archived } = await req.json();

    const authenticatedUserId = getAuthUserId(req);
    if (!authenticatedUserId) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in.", chats: [] },
        { status: 401 }
      );
    }

    await connectDB();

    const query: Record<string, any> = {
      userId: authenticatedUserId,
    };

    if (conversationId) {
      query.conversationId = conversationId;
    } else {
      if (archived === true) {
        query.isArchived = true;
      } else {
        query.isArchived = { $ne: true };
      }
    }

    const chats = await Chat.find(query)
      .sort({ createdAt: 1 })
      .limit(200);

    return NextResponse.json({ chats: chats || [] }, { status: 200 });
  } catch (error) {
    console.error("HISTORY ERROR:", error);
    return NextResponse.json(
      { message: "Failed to fetch history", chats: [] },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const archiveParam = searchParams.get("archive");

    if (!conversationId) {
      return NextResponse.json(
        { message: "conversationId is required" },
        { status: 400 }
      );
    }

    const isArchived = archiveParam === "true";

    const authenticatedUserId = getAuthUserId(req);
    if (!authenticatedUserId) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    await connectDB();

    const query: Record<string, any> = { userId: authenticatedUserId };
    if (conversationId === "legacy") {
      query.$or = [
        { conversationId: { $exists: false } },
        { conversationId: null },
        { conversationId: "" },
      ];
    } else {
      query.conversationId = conversationId;
    }

    const result = await Chat.updateMany(query, { $set: { isArchived } });

    return NextResponse.json({
      success: true,
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("PUT HISTORY ERROR:", error);
    return NextResponse.json(
      { message: "Failed to update conversation archive status" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { message: "conversationId is required" },
        { status: 400 }
      );
    }

    const authenticatedUserId = getAuthUserId(req);
    if (!authenticatedUserId) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    await connectDB();

    const deleteQuery: Record<string, any> = { userId: authenticatedUserId };
    if (conversationId === "legacy") {
      deleteQuery.$or = [
        { conversationId: { $exists: false } },
        { conversationId: null },
        { conversationId: "" },
      ];
    } else {
      deleteQuery.conversationId = conversationId;
    }

    const result = await Chat.deleteMany(deleteQuery);

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("DELETE HISTORY ERROR:", error);
    return NextResponse.json(
      { message: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}