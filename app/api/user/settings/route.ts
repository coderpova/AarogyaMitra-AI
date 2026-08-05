import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function PUT(request: Request) {
  try {
    await connectDB();

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { message: "No token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const decoded: any = jwt.verify(token, JWT_SECRET);

    const body = await request.json();
    const { language } = body;

    if (!language) {
      return NextResponse.json(
        { message: "Language is required" },
        { status: 400 }
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      decoded.userId,
      {
        $set: {
          "settings.language": language,
        },
      },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Language updated successfully",
        user: updatedUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
