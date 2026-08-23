import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Scheme from "@/models/Scheme";
import fallbackSchemes from "@/data/schemes.json";

export async function GET() {
  try {
    await dbConnect();

    let schemes = await Scheme.find({}).sort({ createdAt: -1 });

    if (!schemes || schemes.length === 0) {
      schemes = fallbackSchemes as any[];
    }

    return NextResponse.json(
      {
        success: true,
        schemes,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching schemes, serving fallback:", error);

    return NextResponse.json(
      {
        success: true,
        schemes: fallbackSchemes,
      },
      { status: 200 }
    );
  }
}