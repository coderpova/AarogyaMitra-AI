/**
 * AarogyaMitra AI — Offline Chat Orchestrator
 * Main entry point for the Offline Medical Brain.
 * Coordinates all modules and produces a human-like conversational response.
 *
 * Interface mirrors the Groq API response: { reply: string, session: ConversationSession }
 * This allows future swap-in of a local AI model with minimal changes.
 */

import { detectEmergency } from "./emergencyDetector";
import { extractSymptoms } from "./symptomExtractor";
import { calculateRisk } from "./riskEngine";
import { MedicalCondition, GENERAL_FIRST_AID } from "./medicalKnowledge";
import {
  ConversationSession,
  createSession,
  updateSessionWithExtraction,
  processFollowUpAnswer,
  markAdviceGiven,
  isAnswerToQuestion
} from "./conversationManager";

export type { ConversationSession };

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

function formatQuestion(
  question: { text: { en: string; hi: string } },
  language: string
): string {
  return language === "hi" ? question.text.hi : question.text.en;
}

function formatRiskBadge(
  risk: { emoji: string; level: string; urgency: { en: string; hi: string } },
  language: string
): string {
  const urgency = language === "hi" ? risk.urgency.hi : risk.urgency.en;
  return `${risk.emoji} **${risk.level} Risk** — ${urgency}`;
}

function formatFirstAid(
  condition: MedicalCondition,
  language: string
): string {
  const steps = condition.firstAid
    .map((step, i) => `${i + 1}. ${language === "hi" ? step.hi : step.en}`)
    .join("\n");
  return steps;
}

function formatDoctorAdvice(
  condition: MedicalCondition,
  language: string
): string {
  return language === "hi"
    ? condition.doctorAdvice.hi
    : condition.doctorAdvice.en;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETE RESPONSE BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

function buildInitialResponse(
  session: ConversationSession,
  language: string
): string {
  const { detectedConditions, currentRisk, pendingQuestion } = session;

  if (!detectedConditions.length || !currentRisk) {
    return language === "hi"
      ? `नमस्ते 🙏 मैं AarogyaMitra का ऑफलाइन मेडिकल असिस्टेंट हूं।

अभी इंटरनेट उपलब्ध नहीं है, लेकिन मैं आपकी मदद कर सकता हूं।

कृपया मुझे बताएं:
• आपको क्या लक्षण हैं?
• कितने समय से हैं?
• दर्द का स्तर क्या है (1-10)?

मैं आपको सही मार्गदर्शन दूंगा।`
      : `Hello 🙏 I am AarogyaMitra's Offline Medical Brain.

Internet is currently unavailable, but I can still help you.

Please tell me:
• What symptoms are you experiencing?
• How long have you had them?
• How severe is it (1–10)?

I'll provide you with proper guidance.`;
  }

  const conditionNames = detectedConditions
    .map((c) => (language === "hi" ? c.displayName.hi : c.displayName.en))
    .join(", ");

  const riskLine = formatRiskBadge(currentRisk, language);

  let response = "";

  if (language === "hi") {
    response = `मैं समझ गया। आपके लक्षणों में **${conditionNames}** की जानकारी मिल रही है।

${riskLine}

`;
  } else {
    response = `I understand. Based on your symptoms, I've detected: **${conditionNames}**.

${riskLine}

`;
  }

  // Add follow-up question if available
  if (pendingQuestion) {
    response += language === "hi"
      ? `कुछ और जानकारी चाहिए। **${formatQuestion(pendingQuestion.question, "hi")}**`
      : `I have a follow-up question: **${formatQuestion(pendingQuestion.question, "en")}**`;
  } else {
    // No follow-up questions — go straight to advice
    response += buildAdviceResponse(session, language);
  }

  return response;
}

function buildFollowUpResponse(
  session: ConversationSession,
  language: string
): string {
  const { pendingQuestion, currentRisk } = session;

  if (pendingQuestion) {
    const riskLine = currentRisk ? `\n${formatRiskBadge(currentRisk, language)}\n\n` : "\n";
    return language === "hi"
      ? `${riskLine}अगला सवाल: **${formatQuestion(pendingQuestion.question, "hi")}**`
      : `${riskLine}Next question: **${formatQuestion(pendingQuestion.question, "en")}**`;
  }

  // All questions answered — give final advice
  return buildAdviceResponse(session, language);
}

function buildAdviceResponse(
  session: ConversationSession,
  language: string
): string {
  const { detectedConditions, currentRisk } = session;

  if (!detectedConditions.length) {
    const general = language === "hi" ? GENERAL_FIRST_AID.hi : GENERAL_FIRST_AID.en;
    return general;
  }

  const riskLine = currentRisk ? formatRiskBadge(currentRisk, language) : "";

  // Primary condition (highest risk)
  const primaryCondition = detectedConditions.reduce((prev, curr) => {
    const riskOrder: Record<string, number> = { Emergency: 4, High: 3, Medium: 2, Low: 1 };
    return (riskOrder[curr.defaultRisk] || 0) > (riskOrder[prev.defaultRisk] || 0) ? curr : prev;
  });

  const firstAidSteps = formatFirstAid(primaryCondition, language);
  const doctorAdvice = formatDoctorAdvice(primaryCondition, language);

  let response = "";

  if (language === "hi") {
    const conditionName = primaryCondition.displayName.hi;
    response = `${riskLine}

━━━━━━━━━━━━━━━━━━
🩺 **${conditionName} — प्राथमिक उपचार**
━━━━━━━━━━━━━━━━━━

${firstAidSteps}

📋 **डॉक्टर के पास कब जाएं:**
${doctorAdvice}`;

    // Additional conditions
    if (detectedConditions.length > 1) {
      const others = detectedConditions.slice(1);
      response += `\n\n💡 **अन्य लक्षण भी पाए गए:** ${others.map((c) => c.displayName.hi).join(", ")} — इनके बारे में भी डॉक्टर को बताएं।`;
    }

    response += `\n\n📞 **आपातकालीन नंबर:** 112 (राष्ट्रीय) | 108 (एम्बुलेंस) | 104 (स्वास्थ्य हेल्पलाइन)`;
    response += `\n\n_⚡ ऑफलाइन मोड — यह जानकारी सामान्य मार्गदर्शन के लिए है। कृपया डॉक्टर की सलाह लें।_`;
  } else {
    const conditionName = primaryCondition.displayName.en;
    response = `${riskLine}

━━━━━━━━━━━━━━━━━━
🩺 **${conditionName} — First Aid & Care**
━━━━━━━━━━━━━━━━━━

${firstAidSteps}

📋 **When to see a doctor:**
${doctorAdvice}`;

    if (detectedConditions.length > 1) {
      const others = detectedConditions.slice(1);
      response += `\n\n💡 **Also detected:** ${others.map((c) => c.displayName.en).join(", ")} — mention these to your doctor too.`;
    }

    response += `\n\n📞 **Emergency Numbers:** 112 (National) | 108 (Ambulance) | 104 (Health Helpline)`;
    response += `\n\n_⚡ Offline Mode — This is general guidance. Please consult a doctor._`;
  }

  return response;
}

function buildNoSymptomResponse(language: string): string {
  return language === "hi"
    ? `नमस्ते! 🙏 मैं AarogyaMitra का ऑफलाइन मेडिकल असिस्टेंट हूं।

अभी इंटरनेट उपलब्ध नहीं है, लेकिन मैं आपकी मदद के लिए यहां हूं।

मुझे बताएं आपको क्या तकलीफ है? जैसे:
• बुखार, खांसी, सर्दी
• सिरदर्द, उल्टी, दस्त
• सीने में दर्द, सांस की तकलीफ
• जलन, चोट, कट

मैं आपको सही प्राथमिक उपचार और मार्गदर्शन दूंगा।`
    : `Hello! 🙏 I am AarogyaMitra's Offline Medical Brain.

Internet is currently unavailable, but I'm here to help.

Please describe your problem, for example:
• Fever, cough, cold
• Headache, vomiting, diarrhea
• Chest pain, breathing difficulty
• Burns, injury, cuts

I'll provide you with proper first-aid advice and guidance.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

export async function getOfflineReply(
  message: string,
  language: string,
  session: ConversationSession
): Promise<{ reply: string; session: ConversationSession }> {

  // ── Step 1: Fast-path emergency detection ─────────────────────────────────
  const emergency = detectEmergency(message);
  if (emergency.isEmergency) {
    const reply = language === "hi"
      ? (emergency.responseHi ?? emergency.responseEn ?? "")
      : (emergency.responseEn ?? "");

    return {
      reply,
      session: {
        ...session,
        phase: "complete",
        turnCount: session.turnCount + 1
      }
    };
  }

  // ── Step 2: Check if this is an answer to a pending follow-up question ────
  if (session.pendingQuestion && isAnswerToQuestion(session, message)) {
    const updatedSession = processFollowUpAnswer(session, message);
    const reply = buildFollowUpResponse(updatedSession, language);
    const finalSession = updatedSession.phase === "advising"
      ? markAdviceGiven(updatedSession)
      : updatedSession;

    return { reply, session: finalSession };
  }

  // ── Step 3: Full NLP extraction ───────────────────────────────────────────
  const extracted = extractSymptoms(message);

  // ── Step 4: No symptoms detected ─────────────────────────────────────────
  if (!extracted.conditions.length) {
    return {
      reply: buildNoSymptomResponse(language),
      session: { ...session, turnCount: session.turnCount + 1 }
    };
  }

  // ── Step 5: Risk assessment ───────────────────────────────────────────────
  const risk = calculateRisk(extracted);

  // ── Step 6: Update session with extraction ────────────────────────────────
  const updatedSession = updateSessionWithExtraction(session, extracted, risk);

  // ── Step 7: Build response ────────────────────────────────────────────────
  const reply = buildInitialResponse(updatedSession, language);

  // ── Step 8: Mark advice given if no follow-up questions ──────────────────
  const finalSession = updatedSession.pendingQuestion
    ? updatedSession
    : markAdviceGiven(updatedSession);

  return { reply, session: finalSession };
}

/**
 * Create a fresh conversation session.
 * Call this when the chat is cleared or the page loads.
 */
export { createSession, resetSession } from "./conversationManager";
