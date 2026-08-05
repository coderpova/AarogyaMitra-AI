/**
 * AarogyaMitra AI — Offline Symptom Extractor (NLP Engine)
 * Supports English, Hindi, and Hinglish
 */

import { medicalKnowledgeBase, MedicalCondition } from "./medicalKnowledge";

export type Severity = "mild" | "moderate" | "severe" | "unknown";

export interface ExtractedData {
  /** Matched conditions from knowledge base */
  conditions: MedicalCondition[];
  /** Duration string if detected (e.g. "3 days", "2 hafta") */
  duration: string | null;
  /** Duration in days for risk calculation */
  durationDays: number | null;
  /** Temperature in Fahrenheit if detected */
  temperature: number | null;
  /** Severity modifier detected */
  severity: Severity;
  /** Body part mentioned */
  bodyPart: string | null;
  /** Original normalized text */
  normalizedText: string;
  /** Whether any emergency keyword was hinted (not the full emergency check) */
  hasEmergencyHint: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEVERITY MODIFIERS
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_SEVERE = [
  "bahut zyada", "bahut tez", "bahut bura", "bahut dard", "very severe",
  "very bad", "very high", "extreme", "severe", "unbearable", "intolerable",
  "worst", "excruciating", "sharp", "intense", "terrible", "horrible",
  "8/10", "9/10", "10/10", "9", "10"
];

const SEVERITY_MODERATE = [
  "thoda zyada", "medium", "moderate", "okay", "theek theek",
  "average", "manageable", "bearable", "not too bad", "mild to moderate",
  "5/10", "6/10", "7/10"
];

const SEVERITY_MILD = [
  "thoda", "halka", "mild", "slight", "little", "minor", "small",
  "not much", "kuch khas nahi", "kam", "hafif",
  "1/10", "2/10", "3/10"
];

// ─────────────────────────────────────────────────────────────────────────────
// BODY PART DICTIONARY (multilingual)
// ─────────────────────────────────────────────────────────────────────────────

const BODY_PARTS: Record<string, string[]> = {
  head:    ["head", "sir", "sar", "mathe", "forehead"],
  chest:   ["chest", "seena", "sina", "dil", "heart"],
  stomach: ["stomach", "pet", "pait", "abdomen", "tummy", "navel", "nabi"],
  back:    ["back", "peeth", "kamar", "lower back"],
  arm:     ["arm", "baah", "haath", "wrist", "elbow"],
  leg:     ["leg", "pair", "ghutna", "knee", "ankle"],
  throat:  ["throat", "gala", "neck", "gardan"],
  eye:     ["eye", "aankh", "vision"],
};

// ─────────────────────────────────────────────────────────────────────────────
// DURATION PATTERNS (EN + HI + Hinglish)
// ─────────────────────────────────────────────────────────────────────────────

const DURATION_PATTERNS: Array<{ pattern: RegExp; daysMultiplier: number }> = [
  { pattern: /(\d+)\s*(din|days?|dino se|day se)/i,         daysMultiplier: 1 },
  { pattern: /(\d+)\s*(hafte?|week)/i,                      daysMultiplier: 7 },
  { pattern: /(\d+)\s*(mahine?|months?)/i,                  daysMultiplier: 30 },
  { pattern: /kuch\s*(din|dino)/i,                          daysMultiplier: 1 }, // "kuch din" = ~2 days
  { pattern: /(aaj se|today)/i,                             daysMultiplier: 1 },
  { pattern: /(kal se|yesterday)/i,                         daysMultiplier: 1 },
  { pattern: /(parso|day before)/i,                         daysMultiplier: 2 },
  { pattern: /(pichle hafte|last week)/i,                   daysMultiplier: 7 },
  { pattern: /(pichle mahine|last month)/i,                 daysMultiplier: 30 },
];

// ─────────────────────────────────────────────────────────────────────────────
// TEMPERATURE PATTERNS
// ─────────────────────────────────────────────────────────────────────────────

const TEMPERATURE_PATTERNS: RegExp[] = [
  /(\d{2,3})\s*°?\s*f(?:ahrenheit)?/i,
  /(\d{2,3})\s*(?:degree|डिग्री|digree)/i,
  /temperature\s*(?:is|=|:)?\s*(\d{2,3})/i,
  /bukhar\s*(?:hai)?\s*(\d{2,3})/i,
  /(\d{2,3})\s*°?\s*c(?:elsius)?\b/i,  // Celsius — will convert
];

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Normalize common Hinglish/Hindi shortforms
    .replace(/\bkya\b/g, "kya")
    .replace(/\bhain\b/g, "hai")
    .replace(/\bmujhe\b/g, "mujhe")
    .replace(/\bmuje\b/g, "mujhe")
    .replace(/\bho rha\b/g, "ho raha")
    .replace(/\bkr\b/g, "kar")
    .replace(/\bnhi\b/g, "nahi")
    .replace(/[^\w\s\u0900-\u097F°\/]/g, " ") // Keep alphanumeric, Hindi unicode, °, /
    .replace(/\s+/g, " ");
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXTRACTOR
// ─────────────────────────────────────────────────────────────────────────────

export function extractSymptoms(text: string): ExtractedData {
  const normalized = normalizeText(text);

  // ── 1. Condition Matching ──────────────────────────────────────────────────
  const matched: MedicalCondition[] = [];
  const seenConditions = new Set<string>();

  for (const [key, condition] of Object.entries(medicalKnowledgeBase)) {
    if (seenConditions.has(key)) continue;

    for (const keyword of condition.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        matched.push(condition);
        seenConditions.add(key);
        break;
      }
    }
  }

  // ── 2. Duration Detection ─────────────────────────────────────────────────
  let duration: string | null = null;
  let durationDays: number | null = null;

  for (const { pattern, daysMultiplier } of DURATION_PATTERNS) {
    const match = normalized.match(pattern);
    if (match) {
      const num = match[1] ? parseInt(match[1], 10) : 2;
      durationDays = num * daysMultiplier;
      duration = match[0];
      break;
    }
  }

  // ── 3. Temperature Detection ──────────────────────────────────────────────
  let temperature: number | null = null;

  for (const pattern of TEMPERATURE_PATTERNS) {
    const match = normalized.match(pattern);
    if (match) {
      let temp = parseFloat(match[1]);
      // Celsius to Fahrenheit conversion
      if (temp < 50) {
        temp = (temp * 9) / 5 + 32;
      }
      temperature = Math.round(temp);
      break;
    }
  }

  // ── 4. Severity Detection ─────────────────────────────────────────────────
  let severity: Severity = "unknown";

  if (SEVERITY_SEVERE.some((kw) => normalized.includes(kw))) {
    severity = "severe";
  } else if (SEVERITY_MODERATE.some((kw) => normalized.includes(kw))) {
    severity = "moderate";
  } else if (SEVERITY_MILD.some((kw) => normalized.includes(kw))) {
    severity = "mild";
  }

  // ── 5. Body Part Detection ────────────────────────────────────────────────
  let bodyPart: string | null = null;

  for (const [part, keywords] of Object.entries(BODY_PARTS)) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      bodyPart = part;
      break;
    }
  }

  // ── 6. Emergency Hint Detection ───────────────────────────────────────────
  const emergencyHintWords = [
    "emergency", "urgent", "immediate", "help", "bachao", "danger",
    "unconscious", "behosh", "not breathing", "bleeding a lot"
  ];
  const hasEmergencyHint =
    matched.some((c) => c.emergency) ||
    emergencyHintWords.some((w) => normalized.includes(w));

  return {
    conditions: matched,
    duration,
    durationDays,
    temperature,
    severity,
    bodyPart,
    normalizedText: normalized,
    hasEmergencyHint
  };
}
