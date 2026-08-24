import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Scheme from "@/models/Scheme";
import fallbackSchemes from "@/data/schemes.json";

export async function GET() {
  try {
    await dbConnect();

    let dbSchemes = await Scheme.find({}).sort({ createdAt: -1 });

    if (!dbSchemes || dbSchemes.length === 0) {
      dbSchemes = fallbackSchemes as any[];
    }

    // Ensure non-health legacy categories (e.g. Education, Farmers, Employment, Housing) are excluded
    const nonHealthCategories = ["education", "farmers", "employment", "housing"];
    const schemes = dbSchemes.filter((s: any) => {
      const cat = (s.category || "").toLowerCase();
      return !nonHealthCategories.includes(cat);
    });

    const finalSchemes = schemes.length > 0 ? schemes : fallbackSchemes;

    return NextResponse.json(
      {
        success: true,
        schemes: finalSchemes,
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