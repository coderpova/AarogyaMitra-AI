export const MOODS = ["great", "good", "neutral", "low", "poor"] as const;
export type Mood = (typeof MOODS)[number];

export type DailyHealthInput = {
  steps?: number;
  waterIntakeMl?: number;
  sleepHours?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  heartRate?: number | null;
  bloodPressure?: { systolic?: number | null; diastolic?: number | null };
  bloodSugar?: number | null;
  mood?: Mood | null;
  stressLevel?: number | null;
  notes?: string;
};

export function calculateBmi(weightKg?: number | null, heightCm?: number | null) {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function calculateDailyHealthScore(data: DailyHealthInput) {
  const scores: number[] = [];
  if (data.steps !== undefined) scores.push(Math.min(100, Math.round((data.steps / 8000) * 100)));
  if (data.waterIntakeMl !== undefined) scores.push(Math.min(100, Math.round((data.waterIntakeMl / 2000) * 100)));
  if (data.sleepHours != null) scores.push(data.sleepHours >= 7 && data.sleepHours <= 9 ? 100 : Math.max(40, 100 - Math.abs(8 - data.sleepHours) * 20));
  if (data.heartRate != null) scores.push(data.heartRate >= 60 && data.heartRate <= 100 ? 100 : 65);
  if (data.bloodPressure?.systolic != null && data.bloodPressure?.diastolic != null) scores.push(data.bloodPressure.systolic <= 120 && data.bloodPressure.diastolic <= 80 ? 100 : 65);
  if (data.stressLevel != null) scores.push((11 - data.stressLevel) * 10);
  if (data.mood) scores.push({ great: 100, good: 85, neutral: 65, low: 45, poor: 25 }[data.mood]);
  return scores.length ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length) : 0;
}
