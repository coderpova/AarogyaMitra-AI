import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Chat from "@/models/chat";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { userId, conversationId, archived } = await req.json();

    if(!userId){
      return NextResponse.json(
        {
          message:"User id required"
        },
        {
          status:400
        }
      );
    }

    await connectDB();

    const query: Record<string, unknown> = { userId };
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
    .sort({
      createdAt:1
    })
    .limit(200);

    return NextResponse.json({
      chats
    });

  }
  catch(error){
    console.error(
      "HISTORY ERROR:",
      error
    );

    return NextResponse.json(
      {
        message:"Failed to fetch history"
      },
      {
        status:500
      }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const archiveParam = searchParams.get("archive"); // "true" or "false"

    if (!conversationId) {
      return NextResponse.json(
        { message: "conversationId is required" },
        { status: 400 }
      );
    }

    const isArchived = archiveParam === "true";

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
        // ignore invalid token
      }
    }

    const resolvedUserId = authenticatedUserId || "guest";

    await connectDB();

    const query: Record<string, any> = { userId: resolvedUserId };
    if (conversationId === "legacy") {
      query.$or = [
        { conversationId: { $exists: false } },
        { conversationId: null },
        { conversationId: "" }
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
        // ignore invalid token
      }
    }

    const resolvedUserId = authenticatedUserId || "guest";

    await connectDB();

    const deleteQuery: Record<string, any> = { userId: resolvedUserId };
    if (conversationId === "legacy") {
      deleteQuery.$or = [
        { conversationId: { $exists: false } },
        { conversationId: null },
        { conversationId: "" }
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