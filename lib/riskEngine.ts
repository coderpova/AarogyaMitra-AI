interface HealthData {
  symptoms: string[];
  duration?: string;
  temperature?: number;
  chestPain?: boolean;
  breathingProblem?: boolean;
}

export function calculateRisk(data: HealthData) {
  let risk = "Low";
  let reason = "Normal symptoms";

  // Emergency conditions
  if (data.chestPain || data.breathingProblem) {
    return {
      risk: "High",
      reason: "Chest pain or breathing difficulty detected — seek immediate medical help"
    };
  }

  // Check if any symptom is marked as emergency
  const hasEmergency = data.symptoms.some(
    (s: any) => s.emergency === true
  );
  if (hasEmergency) {
    return {
      risk: "High",
      reason: "Emergency symptom detected — please seek immediate medical attention"
    };
  }

  // High fever
  if (data.temperature && data.temperature >= 103) {
    risk = "High";
    reason = "High fever detected (103°F+). Please consult a doctor.";
  }
  // Moderate fever
  else if (data.temperature && data.temperature >= 101) {
    risk = "Medium";
    reason = "Moderate fever detected. Monitor and stay hydrated.";
  }

  // Fever for many days
  if (data.duration && data.duration.includes("day")) {
    const dayMatch = data.duration.match(/(\d+)/);
    const days = dayMatch ? parseInt(dayMatch[1]) : 1;
    if (days >= 5) {
      risk = "High";
      reason = "Symptoms continuing for 5+ days — please visit a doctor.";
    } else if (days >= 3) {
      risk = "Medium";
      reason = "Fever continuing for multiple days";
    }
  }

  // Multiple symptoms present
  if (data.symptoms.length >= 3) {
    if (risk === "Low") {
      risk = "Medium";
      reason = "Multiple symptoms detected — consider visiting a doctor.";
    }
  }

  return {
    risk,
    reason
  };
}
