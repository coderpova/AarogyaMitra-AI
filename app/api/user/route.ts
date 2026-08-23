import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getAuthUserId } from "@/lib/jwtHelper";

// ================= GET USER =================
export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json(
        { message: "No token provided or invalid token" },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error("GET /api/user error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ================= UPDATE PROFILE =================
export async function PUT(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json(
        { message: "No token provided or invalid token" },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          "profile.age": body.age !== undefined ? Number(body.age) : undefined,
          "profile.gender": body.gender,
          "profile.bloodGroup": body.bloodGroup,
          "profile.phone": body.phone,
          "profile.address": body.address,
        },
      },
      { new: true }
    ).select("-password");

    return NextResponse.json(
      { message: "Profile updated successfully", user: updatedUser },
      { status: 200 }
    );
  } catch (error) {
    console.error("User profile update error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}