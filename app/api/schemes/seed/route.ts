import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Scheme from "@/models/Scheme";
import schemes from "@/data/schemes.json";

export async function GET() {
  try {
    await connectDB();

    // Purane records delete
    await Scheme.deleteMany({});

    // JSON data insert
    await Scheme.insertMany(schemes);

    return NextResponse.json({
      success: true,
      message: "Schemes inserted successfully.",
      total: schemes.length,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to seed database.",
      },
      {
        status: 500,
      }
    );
  }
}