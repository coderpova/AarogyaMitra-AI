import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Scheme from "@/models/Scheme";

export async function GET() {
  try {
    await dbConnect();

    const schemes = await Scheme.find({}).sort({ createdAt: -1 });

    return NextResponse.json(
      {
        success: true,
        schemes,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching schemes:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch schemes",
      },
      { status: 500 }
    );
  }
}