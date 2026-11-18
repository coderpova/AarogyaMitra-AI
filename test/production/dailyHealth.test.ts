import { describe, it, expect } from "@jest/globals";
import { calculateBmi, calculateDailyHealthScore } from "@/lib/dailyHealth";

describe("Daily Health Utilities", () => {
  it("calculates BMI correctly", () => {
    const bmi = calculateBmi(70, 175);
    expect(bmi).toBe(22.9);
  });

  it("handles null values gracefully", () => {
    expect(calculateBmi(null, 175)).toBeNull();
    expect(calculateBmi(70, null)).toBeNull();
  });

  it("calculates daily health score", () => {
    const score = calculateDailyHealthScore({
      steps: 8000,
      waterIntakeMl: 2000,
      sleepHours: 8,
      heartRate: 72,
      stressLevel: 2,
    });
    expect(score).toBeGreaterThan(80);
  });
});
