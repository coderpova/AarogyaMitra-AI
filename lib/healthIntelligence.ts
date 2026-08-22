/* eslint-disable @typescript-eslint/no-explicit-any */

export type HealthIntent = 
  | "PROFILE"
  | "MEDICINES"
  | "APPOINTMENTS"
  | "REPORTS"
  | "ACTIVITY"
  | "BLOOD_PRESSURE"
  | "BLOOD_SUGAR"
  | "WEIGHT"
  | "SLEEP"
  | "STRESS"
  | "MOOD"
  | "OVERALL_HEALTH"
  | "HEALTH_TREND"
  | "REPORT_COMPARISON"
  | "MEDICINE_ADHERENCE"
  | "EMERGENCY";

const intentPatterns: Record<HealthIntent, RegExp> = {
  PROFILE: /(profile|blood group|age|gender|medical history|allergies|history|umer|umar|umar kitni|blood group kya hai|mera profile)/i,
  MEDICINES: /(medicine|medications|pill|tablet|capsul|dawa|goli|dose|dosage|prescrip|drug|remind|taking|khana|goliya|goliyan|dawaein|dawaiyan|medicines|dawai)/i,
  APPOINTMENTS: /(appointment|apoyntment|apointment|doctor|doc|visit|specialist|hospit|schedul|upcoming|previous|reschedul|date|time|milna|milne|kab jana|appointment kab hai|doctor ko kab milna)/i,
  REPORTS: /(report|riport|blood report|lab report|test report|latest report|my report|analyze report|report result|findings|lab result|urine|analys|hemoglobin|cholesterol|thyroid|finding|khoon|blood report|meri report|report me kya aaya|report kya bol rahi hai|report check karo|meri blood report|latest report batao|report analyze karo|report ka result|report me problem|रिपोर्ट|मेरी रिपोर्ट|मेरी ब्लड रिपोर्ट|रिपोर्ट में क्या आया|रिपोर्ट का रिजल्ट|रिपोर्ट चेक करो|रिपोर्ट का विश्लेषण|स्वास्थ्य रिपोर्ट)/i,
  ACTIVITY: /(step|walk|activit|water|intak|pani|exercise|chalna)/i,
  BLOOD_PRESSURE: /(blood pressure|bp|pressure|रक्तचाप|ब्लड प्रेशर)/i,
  BLOOD_SUGAR: /(blood sugar|sugar|glucose|glucos|रक्त शर्करा)/i,
  WEIGHT: /(weight|vajan|वजन|bmi)/i,
  SLEEP: /(sleep|soya|neend|नींद)/i,
  STRESS: /(stress|tension|तनाव)/i,
  MOOD: /(mood|मूड)/i,
  OVERALL_HEALTH: /(health overall|overall health|how is my health|meri health|health kais|health review|health summary|kaisa chal raha|स्वास्थ्य स्थिति|health kaisi hai|meri health kaisi chal rahi hai)/i,
  HEALTH_TREND: /(health trend|trend kya hai|improve ho rahi|better hai|worse ho rahi)/i,
  REPORT_COMPARISON: /(compare.*report|report.*compare|latest.*previous|report.*better|report.*difference|report.*improve|dono report|reports compare karo|report.*comparison|पिछली.*रिपोर्ट.*मौजूदा|रिपोर्ट.*तुलना)/i,
  MEDICINE_ADHERENCE: /(medicine.*regular|medicine.*miss|medication adherence|medicines regular chal rahi)/i,
  EMERGENCY: /(chest pain|difficulty breathing|can't breathe|behosh|बेहोश|सीने में दर्द|saans nahi aa rahi|severe bleeding|बहुत ज्यादा खून|stroke symptoms|emergency|heart attack|dil ka daura|saans|unconscious)/i,
};

export function detectHealthIntents(query: string): HealthIntent[] {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
  const intents: HealthIntent[] = [];

  for (const [intent, regex] of Object.entries(intentPatterns)) {
    if (regex.test(normalized)) {
      intents.push(intent as HealthIntent);
    }
  }

  // Fallback: If no intents found, assume overall health for generic chats
  if (intents.length === 0) {
    intents.push("OVERALL_HEALTH");
  }

  // Emergency intent takes priority but we still return others for context
  return intents;
}

export function analyzeSleep(logs: any[]): string {
  const sleepLogs = logs.filter(l => typeof l.sleepHours === 'number');
  if (sleepLogs.length === 0) return "Sleep data unavailable.";
  
  const sum = sleepLogs.reduce((acc, curr) => acc + curr.sleepHours, 0);
  const avg = (sum / sleepLogs.length).toFixed(1);
  const min = Math.min(...sleepLogs.map(l => l.sleepHours));
  const max = Math.max(...sleepLogs.map(l => l.sleepHours));
  
  let trend = "Insufficient data for trend";
  if (sleepLogs.length >= 3) {
    const recent = sleepLogs[0].sleepHours;
    const older = sleepLogs[sleepLogs.length - 1].sleepHours;
    if (recent > older + 1) trend = "Increasing";
    else if (recent < older - 1) trend = "Decreasing";
    else trend = "Stable";
  }

  return `[Sleep Analysis (Available days: ${sleepLogs.length})] Average: ${avg} hours, Range: ${min}-${max} hours, Trend: ${trend}${sleepLogs.length < 3 ? " (Note: Limited recent data available)" : ""}`;
}

export function analyzeBP(logs: any[]): string {
  const bpLogs = logs.filter(l => l.bloodPressure && typeof l.bloodPressure.systolic === 'number' && typeof l.bloodPressure.diastolic === 'number');
  if (bpLogs.length === 0) return "BP data unavailable.";

  const sysSum = bpLogs.reduce((acc, curr) => acc + curr.bloodPressure.systolic, 0);
  const diaSum = bpLogs.reduce((acc, curr) => acc + curr.bloodPressure.diastolic, 0);
  const sysAvg = Math.round(sysSum / bpLogs.length);
  const diaAvg = Math.round(diaSum / bpLogs.length);

  let trend = "Insufficient data for trend";
  if (bpLogs.length >= 3) {
    const recentSys = bpLogs[0].bloodPressure.systolic;
    const olderSys = bpLogs[bpLogs.length - 1].bloodPressure.systolic;
    if (recentSys > olderSys + 5) trend = "Increasing";
    else if (recentSys < olderSys - 5) trend = "Decreasing";
    else trend = "Stable";
  }

  const elevated = bpLogs.filter(l => l.bloodPressure.systolic > 140 || l.bloodPressure.diastolic > 90).length;

  return `[BP Analysis (Available readings: ${bpLogs.length})] Average: ${sysAvg}/${diaAvg} mmHg, Trend: ${trend}, Elevated readings: ${elevated}${bpLogs.length < 3 ? " (Note: Limited recent data available)" : ""}`;
}

export function analyzeBloodSugar(logs: any[]): string {
  const sugarLogs = logs.filter(l => typeof l.bloodSugar === 'number');
  if (sugarLogs.length === 0) return "Blood sugar data unavailable.";

  const sum = sugarLogs.reduce((acc, curr) => acc + curr.bloodSugar, 0);
  const avg = Math.round(sum / sugarLogs.length);
  const elevated = sugarLogs.filter(l => l.bloodSugar > 140).length;

  return `[Blood Sugar Analysis (Available readings: ${sugarLogs.length})] Average: ${avg} mg/dL, Elevated readings (>140): ${elevated}${sugarLogs.length < 3 ? " (Note: Limited recent data available)" : ""}`;
}

export function analyzeWeight(logs: any[]): string {
  const weightLogs = logs.filter(l => typeof l.weight === 'number');
  if (weightLogs.length < 2) return "Not enough weight data to determine trend.";

  const latest = weightLogs[0].weight;
  const previous = weightLogs[weightLogs.length - 1].weight;
  const diff = (latest - previous).toFixed(1);
  let trend = "Insufficient data for trend";
  
  if (weightLogs.length >= 3) {
    if (latest > previous + 0.5) trend = "Increasing";
    else if (latest < previous - 0.5) trend = "Decreasing";
    else trend = "Stable";
  }

  return `[Weight Analysis (Available readings: ${weightLogs.length})] Previous: ${previous} kg, Latest: ${latest} kg, Change: ${diff} kg, Trend: ${trend}${weightLogs.length < 3 ? " (Note: Limited recent data available)" : ""}`;
}

export function analyzeStress(logs: any[]): string {
  const stressLogs = logs.filter(l => typeof l.stressLevel === 'number');
  if (stressLogs.length === 0) return "Stress data unavailable.";

  const sum = stressLogs.reduce((acc, curr) => acc + curr.stressLevel, 0);
  const avg = (sum / stressLogs.length).toFixed(1);

  let trend = "Insufficient data for trend";
  if (stressLogs.length >= 3) {
    const recent = stressLogs[0].stressLevel;
    const older = stressLogs[stressLogs.length - 1].stressLevel;
    if (recent > older + 1) trend = "Increasing";
    else if (recent < older - 1) trend = "Decreasing";
    else trend = "Stable";
  }

  return `[Stress Analysis (1-10) (Available days: ${stressLogs.length})] Average: ${avg}, Trend: ${trend}${stressLogs.length < 3 ? " (Note: Limited recent data available)" : ""}`;
}

export function analyzeMood(logs: any[]): string {
  const moodLogs = logs.filter(l => l.mood && typeof l.mood === 'string');
  if (moodLogs.length === 0) return "Mood data unavailable.";

  const latestMood = moodLogs[0].mood;
  return `[Mood Analysis] Latest recorded mood: ${latestMood}`;
}
