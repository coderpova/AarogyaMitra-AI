/**
 * AarogyaMitra AI — Decision Engine
 * Manages follow-up question trees based on detected conditions.
 * Never repeats already-answered questions.
 */

import { MedicalCondition, FollowUpQuestion, RiskLevel } from "./medicalKnowledge";
import { RiskResult, escalateRisk } from "./riskEngine";

export interface PendingQuestion {
  conditionName: string;
  question: FollowUpQuestion;
}

export interface DecisionResult {
  /** The next question to ask (null if all questions exhausted) */
  nextQuestion: PendingQuestion | null;
  /** Whether this round of questions is complete */
  isComplete: boolean;
  /** Updated risk after processing the answer */
  updatedRisk: RiskResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// ANSWER ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

function doesAnswerEscalate(
  answer: string,
  question: FollowUpQuestion
): boolean {
  if (!question.escalationKeywords?.length) return false;
  const normalized = answer.toLowerCase();
  return question.escalationKeywords.some((kw) =>
    normalized.includes(kw.toLowerCase())
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DECISION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export class DecisionEngine {
  private conditions: MedicalCondition[];
  private answeredQuestionIds: Set<string>;

  constructor(conditions: MedicalCondition[]) {
    this.conditions = conditions;
    this.answeredQuestionIds = new Set();
  }

  /**
   * Get the next unanswered follow-up question across all detected conditions.
   */
  getNextQuestion(): PendingQuestion | null {
    for (const condition of this.conditions) {
      for (const question of condition.questions) {
        if (!this.answeredQuestionIds.has(question.id)) {
          return { conditionName: condition.name, question };
        }
      }
    }
    return null;
  }

  /**
   * Process a user's answer to a follow-up question.
   * Returns updated risk and the next question (if any).
   */
  processAnswer(
    answeredQuestion: PendingQuestion,
    answer: string,
    currentRisk: RiskResult
  ): DecisionResult {
    // Mark this question as answered
    this.answeredQuestionIds.add(answeredQuestion.question.id);

    // Check for risk escalation
    let updatedRisk = currentRisk;
    if (
      answeredQuestion.question.escalateTo &&
      doesAnswerEscalate(answer, answeredQuestion.question)
    ) {
      updatedRisk = escalateRisk(currentRisk, answeredQuestion.question.escalateTo);
    }

    // Get next question
    const nextQuestion = this.getNextQuestion();

    return {
      nextQuestion,
      isComplete: nextQuestion === null,
      updatedRisk
    };
  }

  /**
   * Mark a question as answered without processing an answer (for skips).
   */
  skipQuestion(questionId: string): void {
    this.answeredQuestionIds.add(questionId);
  }

  /**
   * How many questions have been answered.
   */
  get answeredCount(): number {
    return this.answeredQuestionIds.size;
  }

  /**
   * Total number of questions across all conditions.
   */
  get totalQuestions(): number {
    return this.conditions.reduce((sum, c) => sum + c.questions.length, 0);
  }

  /**
   * Reset for a new conversation.
   */
  reset(conditions?: MedicalCondition[]): void {
    this.answeredQuestionIds.clear();
    if (conditions) this.conditions = conditions;
  }
}
