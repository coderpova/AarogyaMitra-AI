import { Schema, model, models } from "mongoose";

const DailyHealthLogSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true },
    steps: { type: Number, min: 0, default: 0 },
    waterIntakeMl: { type: Number, min: 0, default: 0 },
    sleepHours: { type: Number, min: 0, max: 24, default: null },
    weightKg: { type: Number, min: 1, max: 500, default: null },
    heightCm: { type: Number, min: 30, max: 300, default: null },
    bmi: { type: Number, default: null },
    heartRate: { type: Number, min: 20, max: 300, default: null },
    bloodPressure: {
      systolic: { type: Number, min: 50, max: 250, default: null },
      diastolic: { type: Number, min: 30, max: 150, default: null },
    },
    bloodSugar: { type: Number, min: 20, max: 1000, default: null },
    mood: { type: String, enum: ["great", "good", "neutral", "low", "poor"], default: null },
    stressLevel: { type: Number, min: 1, max: 10, default: null },
    notes: { type: String, trim: true, maxlength: 2000, default: "" },
    healthScore: { type: Number, min: 0, max: 100, default: 0 },
  },
  { timestamps: true }
);

DailyHealthLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export default models.DailyHealthLog || model("DailyHealthLog", DailyHealthLogSchema);
