/**
 * AarogyaMitra AI — Risk Engine
 * Scores patient risk as Low / Medium / High / Emergency
 * based on detected conditions, duration, temperature, and severity.
 */

import { RiskLevel, MedicalCondition } from "./medicalKnowledge";
import { ExtractedData, Severity } from "./symptomExtractor";

export interface RiskResult {
  level: RiskLevel;
  score: number; // 0–100
  reasons: string[];
  color: string; // CSS color
  emoji: string;
  urgency: { en: string; hi: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// RISK LABELS
// ─────────────────────────────────────────────────────────────────────────────

const RISK_META: Record<RiskLevel, { color: string; emoji: string; urgency: { en: string; hi: string } }> = {
  Low: {
    color: "#22c55e",
    emoji: "✅",
    urgency: {
      en: "Low Risk — Home care should be sufficient. Monitor symptoms.",
      hi: "कम जोखिम — घर पर देखभाल पर्याप्त होनी चाहिए। लक्षणों पर नज़र रखें।"
    }
  },
  Medium: {
    color: "#f59e0b",
    emoji: "⚠️",
    urgency: {
      en: "Medium Risk — See a doctor within 24–48 hours if symptoms persist.",
      hi: "मध्यम जोखिम — लक्षण बने रहने पर 24–48 घंटों में डॉक्टर से मिलें।"
    }
  },
  High: {
    color: "#ef4444",
    emoji: "🔴",
    urgency: {
      en: "High Risk — Please visit a clinic or hospital today.",
      hi: "उच्च जोखिम — कृपया आज ही क्लिनिक या अस्पताल जाएं।"
    }
  },
  Emergency: {
    color: "#7c3aed",
    emoji: "🚨",
    urgency: {
      en: "EMERGENCY — Call 112 / 108 immediately. Do not wait.",
      hi: "आपातकाल — तुरंत 112 / 108 पर कॉल करें। प्रतीक्षा न करें।"
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SCORING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function severityScore(severity: Severity): number {
  switch (severity) {
    case "severe":   return 30;
    case "moderate": return 15;
    case "mild":     return 5;
    default:         return 10; // unknown — assume moderate
  }
}

function durationScore(durationDays: number | null): { score: number; reason: string | null } {
  if (!durationDays) return { score: 0, reason: null };
  if (durationDays >= 14) return { score: 35, reason: "Symptoms lasting 2+ weeks" };
  if (durationDays >= 7)  return { score: 25, reason: "Symptoms lasting 1+ week" };
  if (durationDays >= 3)  return { score: 15, reason: "Symptoms lasting 3+ days" };
  if (durationDays >= 2)  return { score: 8,  reason: "Symptoms lasting 2 days" };
  return { score: 3, reason: null };
}

function temperatureScore(temp: number | null): { score: number; reason: string | null } {
  if (!temp) return { score: 0, reason: null };
  if (temp >= 106) return { score: 50, reason: "Dangerously high fever (106°F+)" };
  if (temp >= 104) return { score: 35, reason: "Very high fever (104°F+)" };
  if (temp >= 103) return { score: 25, reason: "High fever (103°F+)" };
  if (temp >= 101) return { score: 10, reason: "Moderate fever (101–103°F)" };
  return { score: 3, reason: null };
}

function scoreToLevel(score: number): RiskLevel {
  if (score >= 70) return "Emergency";
  if (score >= 45) return "High";
  if (score >= 20) return "Medium";
  return "Low";
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RISK CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────

export function calculateRisk(extracted: ExtractedData): RiskResult {
  let score = 0;
  const reasons: string[] = [];

  // ── Emergency conditions (hard override) ──────────────────────────────────
  const hasEmergencyCondition = extracted.conditions.some((c) => c.emergency);
  if (hasEmergencyCondition) {
    const emergencyCondition = extracted.conditions.find((c) => c.emergency)!;
    return {
      level: "Emergency",
      score: 100,
      reasons: [`Emergency condition detected: ${emergencyCondition.displayName.en}`],
      ...RISK_META["Emergency"]
    };
  }

  // ── Base score from conditions ────────────────────────────────────────────
  for (const condition of extracted.conditions) {
    switch (condition.defaultRisk) {
      case "Emergency": score += 70; break;
      case "High":      score += 40; break;
      case "Medium":    score += 20; break;
      case "Low":       score += 5;  break;
    }
    reasons.push(`Detected: ${condition.displayName.en}`);
  }

  // ── Multiple conditions ───────────────────────────────────────────────────
  if (extracted.conditions.length >= 3) {
    score += 15;
    reasons.push("Multiple simultaneous symptoms");
  } else if (extracted.conditions.length === 2) {
    score += 8;
    reasons.push("Two symptom types detected");
  }

  // ── Severity modifier ─────────────────────────────────────────────────────
  const sevScore = severityScore(extracted.severity);
  if (extracted.severity !== "unknown") {
    score += sevScore;
    if (extracted.severity === "severe") reasons.push("Reported as severe");
  }

  // ── Duration modifier ─────────────────────────────────────────────────────
  const { score: durScore, reason: durReason } = durationScore(extracted.durationDays);
  score += durScore;
  if (durReason) reasons.push(durReason);

  // ── Temperature modifier ──────────────────────────────────────────────────
  const { score: tempScore, reason: tempReason } = temperatureScore(extracted.temperature);
  score += tempScore;
  if (tempReason) reasons.push(tempReason);

  // ── Cap at 100 ────────────────────────────────────────────────────────────
  score = Math.min(score, 100);

  const level = scoreToLevel(score);

  return {
    level,
    score,
    reasons: reasons.length ? reasons : ["Symptoms within normal range"],
    ...RISK_META[level]
  };
}

/**
 * Re-calculate risk after a follow-up answer escalates a condition.
 */
export function escalateRisk(
  current: RiskResult,
  newLevel: RiskLevel
): RiskResult {
  const levels: RiskLevel[] = ["Low", "Medium", "High", "Emergency"];
  const currentIdx = levels.indexOf(current.level);
  const newIdx = levels.indexOf(newLevel);

  if (newIdx <= currentIdx) return current; // Only escalate, never de-escalate

  return {
    ...current,
    level: newLevel,
    score: Math.max(current.score, newIdx * 33),
    reasons: [...current.reasons, "Escalated based on follow-up answers"],
    ...RISK_META[newLevel]
  };
}
