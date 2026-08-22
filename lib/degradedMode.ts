// frontend/lib/degradedMode.ts
// Helper functions to generate safe fallback messages when external services fail.

export function mongoFallbackMessage() {
  return {
    error: "SERVICE_UNAVAILABLE",
    message: "Database is temporarily unavailable. Please try again later.",
  };
}

export function groqFallbackMessage() {
  return {
    error: "SERVICE_UNAVAILABLE",
    message: "AI service is temporarily unavailable. Please try again later.",
  };
}

export function ragFallbackMessage() {
  return {
    error: "NO_EVIDENCE",
    message: "Unable to retrieve relevant medical information at this time.",
  };
}

export function safetyFallbackMessage() {
  return {
    error: "SAFETY_BLOCK",
    message: "The response could not be safely generated. Please rephrase your query.",
  };
}
