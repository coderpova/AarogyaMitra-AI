import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import DailyHealthLog from "@/models/DailyHealthLog";
import { calculateBmi, calculateDailyHealthScore, MOODS, type DailyHealthInput } from "@/lib/dailyHealth";

const JWT_SECRET = process.env.JWT_SECRET as string;
const today = () => new Date().toISOString().slice(0, 10);

function userIdFromRequest(request: Request) {
  const token = request.headers.get("authorization")?.split(" ")[1];
  if (!token) return null;
  try { return (jwt.verify(token, JWT_SECRET) as { userId: string }).userId; } catch { return null; }
}

function validNumber(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function parseInput(body: Record<string, unknown>): DailyHealthInput | null {
  const input: DailyHealthInput = {};
  const numericFields = { steps: [0, 100000], waterIntakeMl: [0, 20000], sleepHours: [0, 24], weightKg: [1, 500], heightCm: [30, 300], heartRate: [20, 300], bloodSugar: [20, 1000], stressLevel: [1, 10] } as const;
  for (const [field, [min, max]] of Object.entries(numericFields)) {
    const value = body[field];
    if (value !== undefined && value !== null) {
      if (!validNumber(value, min, max)) return null;
      (input as Record<string, number>)[field] = value;
    }
  }
  if (body.bloodPressure !== undefined) {
    if (!body.bloodPressure || typeof body.bloodPressure !== "object") return null;
    const pressure = body.bloodPressure as Record<string, unknown>;
    if (!validNumber(pressure.systolic, 50, 250) || !validNumber(pressure.diastolic, 30, 150)) return null;
    input.bloodPressure = { systolic: pressure.systolic, diastolic: pressure.diastolic };
  }
  if (body.mood !== undefined) { if (!MOODS.includes(body.mood as (typeof MOODS)[number])) return null; input.mood = body.mood as (typeof MOODS)[number]; }
  if (body.notes !== undefined) { if (typeof body.notes !== "string" || body.notes.length > 2000) return null; input.notes = body.notes; }
  return input;
}

export async function GET(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const date = new URL(request.url).searchParams.get("date") || today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ message: "Invalid date" }, { status: 400 });
  await connectDB();
  const log = await DailyHealthLog.findOne({ userId, date }).lean();
  return NextResponse.json({ log }, { status: 200 });
}

export async function PUT(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const input = parseInput(body);
    const date = typeof body.date === "string" ? body.date : today();
    if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ message: "Invalid health data" }, { status: 400 });
    await connectDB();
    const existing = await DailyHealthLog.findOne({ userId, date }).lean();
    const merged = { ...(existing ?? {}), ...input, bloodPressure: input.bloodPressure ?? existing?.bloodPressure } as DailyHealthInput;
    const update = { ...input, bmi: calculateBmi(merged.weightKg, merged.heightCm), healthScore: calculateDailyHealthScore(merged) };
    const log = await DailyHealthLog.findOne({ userId, date });
    if (log) {
      log.set(update);
      await log.save();
    } else {
      await DailyHealthLog.create({ userId, date, ...update });
    }
    const savedLog = await DailyHealthLog.findOne({ userId, date }).lean();
    return NextResponse.json({ log: savedLog }, { status: 200 });
  } catch (error) {
    console.error("Daily health save error:", error);
    return NextResponse.json({ message: "Unable to save health data" }, { status: 500 });
  }
}
