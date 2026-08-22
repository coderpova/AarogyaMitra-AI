import { NextResponse } from "next/server";
import { seedMedicalKnowledge } from "@/lib/ragService";

export async function POST() {
  try {
    console.log("[RAG] Seeding initiated via API POST route...");
    const count = await seedMedicalKnowledge();
    console.log(`[RAG] Seed complete. Inserted ${count} guidelines.`);
    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${count} medical knowledge guidelines in MongoDB.`
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to seed medical knowledge database";
    console.error("[RAG] Seed API route error:", error);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    console.log("[RAG] Seeding initiated via API GET route...");
    const count = await seedMedicalKnowledge();
    console.log(`[RAG] Seed complete. Inserted ${count} guidelines.`);
    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${count} medical knowledge guidelines in MongoDB.`
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to seed medical knowledge database";
    console.error("[RAG] Seed API route error:", error);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
