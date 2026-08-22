// frontend/app/api/healthz/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", service: "aarogyamitra" });
}
