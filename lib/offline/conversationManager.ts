/**
 * AarogyaMitra AI — Conversation Manager
 * Stateful session manager for multi-turn offline medical conversations.
 * Maintains context across messages, decides what to do next each turn.
 */

import { MedicalCondition } from "./medicalKnowledge";
import { ExtractedData } from "./symptomExtractor";
import { RiskResult } from "./riskEngine";
import { DecisionEngine, PendingQuestion } from "./decisionEngine";

export type ConversationPhase =
  | "greeting"        // Initial state
  | "intake"          // Extracting symptoms from user
  | "questioning"     // Asking follow-up questions
  | "advising"        // Giving advice / first aid
  | "complete";       // Session complete

export interface ConversationSession {
  phase: ConversationPhase;
  /** Conditions detected so far */
  detectedConditions: MedicalCondition[];
  /** Last NLP extraction result */
  lastExtraction: ExtractedData | null;
  /** Current risk assessment */
  currentRisk: RiskResult | null;
  /** The current pending follow-up question */
  pendingQuestion: PendingQuestion | null;
  /** Turn counter */
  turnCount: number;
  /** Whether we've given the primary advice at least once */
  hasGivenAdvice: boolean;
  /** Decision engine (serializable separately) */
  _engine: DecisionEngine | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY
// ─────────────────────────────────────────────────────────────────────────────

export function createSession(): ConversationSession {
  return {
    phase: "greeting",
    detectedConditions: [],
    lastExtraction: null,
    currentRisk: null,
    pendingQuestion: null,
    turnCount: 0,
    hasGivenAdvice: false,
    _engine: null
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialize or update the session with new extraction data.
 */
export function updateSessionWithExtraction(
  session: ConversationSession,
  extraction: ExtractedData,
  risk: RiskResult
): ConversationSession {
  const conditions = extraction.conditions;

  // Merge new conditions with existing ones (avoid duplicates)
  const existingNames = new Set(session.detectedConditions.map((c) => c.name));
  const newConditions = conditions.filter((c) => !existingNames.has(c.name));
  const mergedConditions = [...session.detectedConditions, ...newConditions];

  // Create or update decision engine
  let engine = session._engine;
  if (!engine) {
    engine = new DecisionEngine(mergedConditions);
  } else {
    engine.reset(mergedConditions);
  }

  const nextQuestion = engine.getNextQuestion();

  return {
    ...session,
    detectedConditions: mergedConditions,
    lastExtraction: extraction,
    currentRisk: risk,
    pendingQuestion: nextQuestion,
    phase: mergedConditions.length > 0 ? "questioning" : "intake",
    _engine: engine,
    turnCount: session.turnCount + 1
  };
}

/**
 * Process a follow-up answer and advance the session.
 */
export function processFollowUpAnswer(
  session: ConversationSession,
  answer: string
): ConversationSession {
  if (!session._engine || !session.pendingQuestion) return session;

  const { nextQuestion, updatedRisk } = session._engine.processAnswer(
    session.pendingQuestion,
    answer,
    session.currentRisk!
  );

  const allQuestionsAnswered = nextQuestion === null;

  return {
    ...session,
    pendingQuestion: nextQuestion,
    currentRisk: updatedRisk,
    phase: allQuestionsAnswered ? "advising" : "questioning",
    hasGivenAdvice: allQuestionsAnswered ? false : session.hasGivenAdvice,
    turnCount: session.turnCount + 1
  };
}

/**
 * Mark that we've given advice this session.
 */
export function markAdviceGiven(session: ConversationSession): ConversationSession {
  return { ...session, hasGivenAdvice: true, phase: "complete" };
}

/**
 * Reset the session (e.g., user clicks "Clear Chat").
 */
export function resetSession(): ConversationSession {
  return createSession();
}

/**
 * Determine if the current message is an answer to a pending question
 * (vs. a new symptom description).
 */
export function isAnswerToQuestion(
  session: ConversationSession,
  message: string
): boolean {
  if (!session.pendingQuestion) return false;
  if (session.turnCount === 0) return false;

  // If there's a pending question and the message is short (likely an answer)
  const wordCount = message.trim().split(/\s+/).length;
  return wordCount <= 15;
}
