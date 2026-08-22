import connectDB from "./mongodb";
import HealthEvent, { IHealthEvent } from "../models/HealthEvent";
import Medicine from "../models/Medicine";
import ReportHistory from "../models/ReportHistory";
import User from "../models/User";

export interface AIPreferences {
  allowHealthHistory: boolean;
  allowMedicalReports: boolean;
  allowMedications: boolean;
  allowSymptomTimeline: boolean;
}

export interface PersonalHealthContextRequest {
  userId: string;
  query: string;
  conversationContext?: Array<{ role: string; text?: string; content?: string }>;
  preferences?: Partial<AIPreferences>;
}

export interface ContextProvenanceItem {
  type: "symptom" | "condition" | "medication" | "allergy" | "lab_result" | "vital_log" | "history";
  title: string;
  value?: string;
  severity?: string;
  date?: string;
  source: "USER_REPORTED" | "REPORT_EXTRACTED" | "USER_CONFIRMED" | "SYSTEM_DERIVED";
  reportId?: string;
  relevanceScore: number;
  reason: string;
}

export interface PersonalHealthContextResult {
  hasContext: boolean;
  contextText: string;
  provenance: ContextProvenanceItem[];
  itemCount: number;
  excludedCount: number;
  appliedPreferences: AIPreferences;
  resolvedTopic: string;
  telemetry: {
    resolverInvoked: boolean;
    userIdScoped: boolean;
    elapsedMs: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TOPIC & MULTILINGUAL KEYWORD DICTIONARIES
// ─────────────────────────────────────────────────────────────────────────────

interface TopicMapping {
  topic: string;
  keywords: string[];
  relatedTerms: string[];
}

const MEDICAL_TOPIC_MAP: TopicMapping[] = [
  {
    topic: "headache",
    keywords: [
      "headache", "head ache", "migraine", "cephalea", "head pain", "pounding", "frontal headache",
      "सिरदर्द", "सर दर्द", "सिर में दर्द", "माइग्रेन", "दर्द",
      "sir dard", "sar dard", "sir me dard", "sar mein dard", "headache"
    ],
    relatedTerms: ["pain", "nausea", "head", "light sensitivity"],
  },
  {
    topic: "fever",
    keywords: [
      "fever", "pyrexia", "temperature", "febrile", "chills", "high temp", "fever episode",
      "बुखार", "ताप", "ज्वर", "ठंड लगना",
      "bukhar", "taap", "fever", "thand", "garam", "body hot"
    ],
    relatedTerms: ["paracetamol", "infection", "body ache", "dehydration"],
  },
  {
    topic: "cough_cold",
    keywords: [
      "cough", "cold", "flu", "sore throat", "runny nose", "congestion", "sneezing", "mucus", "phlegm",
      "खांसी", "जुकाम", "सर्दी", "गले में खराश", "कफ", "छींक",
      "khasi", "zukam", "sardi", "gale me kharash", "gala kharab", "balgam", "chheenk"
    ],
    relatedTerms: ["throat", "respiratory", "inhaler", "chest"],
  },
  {
    topic: "hypertension",
    keywords: [
      "bp", "blood pressure", "hypertension", "systolic", "diastolic", "high bp", "amlodipine",
      "उच्च रक्तचाप", "रक्तचाप", "बीपी", "हाई बीपी",
      "blood pressure", "high bp", "bp high", "rakhtchap", "bp badha"
    ],
    relatedTerms: ["amlodipine", "telmisartan", "sodium", "salt", "heart", "cardio"],
  },
  {
    topic: "diabetes",
    keywords: [
      "diabetes", "blood sugar", "glucose", "hba1c", "glycemic", "fasting sugar", "pp sugar", "metformin",
      "डायबिटीज", "ब्लड शुगर", "मधुमेह", "शर्करा", "शुगर",
      "sugar", "diabetes", "blood sugar", "madhumeh", "sugar badha", "glucose"
    ],
    relatedTerms: ["metformin", "insulin", "glimepiride", "diet", "carb"],
  },
  {
    topic: "allergy",
    keywords: [
      "allergy", "allergic", "allergies", "rash", "hives", "urticaria", "itching", "reaction", "penicillin", "peanut", "dust", "pollen",
      "एलर्जी", "खुजली", "चकत्ते", "रैश", "पेनिसिलिन",
      "allergy", "khujli", "rash", "chakatte", "allergic reaction", "penicillin"
    ],
    relatedTerms: ["antihistamine", "cetirizine", "skin", "penicillin"],
  },
  {
    topic: "stomach_gi",
    keywords: [
      "stomach", "vomiting", "nausea", "diarrhea", "constipation", "acidity", "gas", "indigestion", "cramp",
      "पेट दर्द", "उल्टी", "दस्त", "कब्ज", "एसिडिटी", "गैस",
      "pet dard", "ulti", "dast", "kabz", "acidity", "loose motion", "pet kharab"
    ],
    relatedTerms: ["ors", "pantoprazole", "antacid", "hydration"],
  },
  {
    topic: "pain_body",
    keywords: [
      "back pain", "body pain", "joint pain", "muscle pain", "arthritis", "sprain", "swelling",
      "कमर दर्द", "पीठ दर्द", "जोड़ों का दर्द", "बदन दर्द", "मांसपेशियों में दर्द",
      "kamar dard", "peeth dard", "jodo ka dard", "badan dard", "dard"
    ],
    relatedTerms: ["analgesic", "paracetamol", "rest", "physiotherapy"],
  },
  {
    topic: "dehydration",
    keywords: [
      "dehydration", "dry mouth", "thirsty", "fluid loss", "electrolyte",
      "पानी की कमी", "निर्जलीकरण", "प्यास", "मुंह सूखना",
      "pani ki kami", "dehydration", "gala sukhna", "pyas", "ors"
    ],
    relatedTerms: ["water", "ors", "fluids"],
  },
  {
    topic: "medication_general",
    keywords: [
      "medicine", "medications", "medicines", "drug", "drugs", "tablet", "capsule", "dose", "dosage", "prescription",
      "dawa", "dawain", "dawai", "dawaiyan", "goli", "metformin", "amlodipine", "active medicines", "active dawaiyan",
      "दवा", "दवाई", "दवाइयां", "खुराक", "गोली", "औषधि", "औषधियां"
    ],
    relatedTerms: ["side effects", "timing", "safety", "dose", "dosage"],
  },
  {
    topic: "symptom_general",
    keywords: [
      "symptom", "symptoms", "reported recently", "symptom history", "timeline",
      "लक्षण", "तकलीफ", "समस्या",
      "lakshan", "takleef", "symptoms"
    ],
    relatedTerms: ["history", "recorded"],
  },
  {
    topic: "condition_general",
    keywords: [
      "condition", "conditions", "chronic", "chronic condition", "diagnosed", "diagnosis", "medical history", "disease",
      "बीमारी", "रोग", "निदान", "इतिहास",
      "bimari", "rog", "history", "diagnosed"
    ],
    relatedTerms: ["medical history", "health history"],
  },
  {
    topic: "report_general",
    keywords: [
      "report", "lab report", "test report", "blood test", "cbc", "lipid", "lft", "kft", "hemoglobin", "hb", "hb test", "platelet", "wbc", "rbc", "fasting sugar", "sugar test",
      "रिपोर्ट", "लैब रिपोर्ट", "रक्त जांच", "खून की जांच", "जांच",
      "report", "lab report", "khoon ki janch", "test result", "hemoglobin", "platelet", "hb test"
    ],
    relatedTerms: ["values", "range", "parameters", "results"],
  }
];

// Ambiguous query markers that reference previous turns
const CONTEXT_REFERENCE_PATTERNS = [
  /\b(it|this|that|these|those)\b/i,
  /\b(ye|yeh|ye kitni|ye kitna|kitna|kitni|kitne)\b/i,
  /\b(phir se|phir|dobara|again|repeated|once more)\b/i,
  /\b(ab kya karu|ab kya kare|kya karu|kya kare|what should i do|what to do now)\b/i,
  /\b(ab kya|what now|next step|aage kya)\b/i,
  /\b(ye dawa|ye medicine|is this safe|ye safe hai|can i take this)\b/i,
  /\b(is report|meri report|report ka kya|what does this mean)\b/i,
  /\b(getting worse|badh raha|kharab ho raha)\b/i,
  /\b(पहले भी|फिर से|दोबारा|अब क्या करूं|यह दवा|इस रिपोर्ट|यह कितनी|यह कितना)\b/u
];

/**
 * Extracts active topics and context keywords from the query and recent conversation turns.
 */
function identifyMedicalTopics(
  query: string,
  history?: Array<{ role: string; text?: string; content?: string }>
): { detectedTopics: string[]; matchedKeywords: string[]; isContextualReferral: boolean; combinedText: string } {
  const normQuery = (query || "").toLowerCase();
  const detectedTopics = new Set<string>();
  const matchedKeywords = new Set<string>();

  // Check if query is an ambiguous referral
  const isContextualReferral = CONTEXT_REFERENCE_PATTERNS.some((p) => p.test(normQuery));

  // Build combined text from recent history (last 3 turns) + current query
  let combinedHistoryText = "";
  if (history && history.length > 0) {
    const recent = history.slice(-4);
    combinedHistoryText = recent.map((m) => (m.text || m.content || "").toLowerCase()).join(" ");
  }

  const combinedText = `${combinedHistoryText} ${normQuery}`.trim();

  for (const item of MEDICAL_TOPIC_MAP) {
    for (const kw of item.keywords) {
      if (normQuery.includes(kw.toLowerCase())) {
        detectedTopics.add(item.topic);
        matchedKeywords.add(kw);
      } else if (isContextualReferral && combinedText.includes(kw.toLowerCase())) {
        detectedTopics.add(item.topic);
        matchedKeywords.add(kw);
      }
    }
  }

  return {
    detectedTopics: Array.from(detectedTopics),
    matchedKeywords: Array.from(matchedKeywords),
    isContextualReferral,
    combinedText,
  };
}

/**
 * Computes topical relevance between a record and the query/detected topics.
 * Returns a score between 0.0 and 1.0.
 */
function calculateRelevance(
  recordText: string,
  recordType: string,
  detectedTopics: string[],
  matchedKeywords: string[],
  query: string
): { score: number; reason: string } {
  const normRecord = recordText.toLowerCase();
  const normQuery = query.toLowerCase();

  // Direct keyword match in query
  for (const kw of matchedKeywords) {
    if (normRecord.includes(kw.toLowerCase())) {
      return { score: 0.95, reason: `Direct match with active topic keyword "${kw}"` };
    }
  }

  // Topic match
  for (const topic of detectedTopics) {
    const mapItem = MEDICAL_TOPIC_MAP.find((m) => m.topic === topic);
    if (mapItem) {
      for (const kw of mapItem.keywords) {
        if (normRecord.includes(kw.toLowerCase())) {
          return { score: 0.85, reason: `Matches detected medical topic "${topic}"` };
        }
      }
      for (const related of mapItem.relatedTerms) {
        if (normRecord.includes(related.toLowerCase())) {
          return { score: 0.65, reason: `Associated with topic area "${topic}" (${related})` };
        }
      }
    }
  }

  // Direct word overlap
  const queryTokens = normQuery.split(/\s+/).filter((t) => t.length > 3);
  let overlapCount = 0;
  for (const token of queryTokens) {
    if (normRecord.includes(token)) {
      overlapCount++;
    }
  }

  if (overlapCount >= 2) {
    return { score: 0.7, reason: `Matches multiple terms in patient query` };
  } else if (overlapCount === 1) {
    return { score: 0.45, reason: `Partial term match` };
  }

  return { score: 0.0, reason: `No topical relevance to current query` };
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE RESOLVER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves minimal, relevant, authorized personal health context for the authenticated user.
 * 
 * Strict Privacy & Isolation Guarantees:
 * - Scoped strictly to authenticated userId.
 * - Enforces explicit user consent (aiPreferences defaulting to false).
 * - Excludes deleted records (isDeleted = true).
 * - Excludes irrelevant topical data.
 * - Caps total output to 3-5 high-relevance items with explicit provenance.
 */
export async function resolvePersonalHealthContext(
  req: PersonalHealthContextRequest
): Promise<PersonalHealthContextResult> {
  const startTime = Date.now();
  const { userId, query, conversationContext, preferences: overridePrefs } = req;

  if (!userId || typeof userId !== "string") {
    return {
      hasContext: false,
      contextText: "",
      provenance: [],
      itemCount: 0,
      excludedCount: 0,
      appliedPreferences: {
        allowHealthHistory: false,
        allowMedicalReports: false,
        allowMedications: false,
        allowSymptomTimeline: false,
      },
      resolvedTopic: "none",
      telemetry: {
        resolverInvoked: true,
        userIdScoped: false,
        elapsedMs: Date.now() - startTime,
      },
    };
  }

  await connectDB();

  // 1. Fetch User Record and User's AI Preferences (Default: all false)
  let user: any = null;
  if (userId.match(/^[0-9a-fA-F]{24}$/)) {
    user = await User.findById(userId).select("-password");
  }

  const effectivePrefs: AIPreferences = {
    allowHealthHistory: overridePrefs?.allowHealthHistory ?? user?.aiPreferences?.allowHealthHistory ?? false,
    allowMedicalReports: overridePrefs?.allowMedicalReports ?? user?.aiPreferences?.allowMedicalReports ?? false,
    allowMedications: overridePrefs?.allowMedications ?? user?.aiPreferences?.allowMedications ?? false,
    allowSymptomTimeline: overridePrefs?.allowSymptomTimeline ?? user?.aiPreferences?.allowSymptomTimeline ?? false,
  };

  // If ALL permissions are disabled, return empty immediately without data retrieval
  if (
    !effectivePrefs.allowHealthHistory &&
    !effectivePrefs.allowMedicalReports &&
    !effectivePrefs.allowMedications &&
    !effectivePrefs.allowSymptomTimeline
  ) {
    return {
      hasContext: false,
      contextText: "",
      provenance: [],
      itemCount: 0,
      excludedCount: 0,
      appliedPreferences: effectivePrefs,
      resolvedTopic: "none",
      telemetry: {
        resolverInvoked: true,
        userIdScoped: true,
        elapsedMs: Date.now() - startTime,
      },
    };
  }

  // 2. Identify Medical Topics and Context References
  const { detectedTopics, matchedKeywords, isContextualReferral } = identifyMedicalTopics(
    query,
    conversationContext
  );

  const candidateItems: ContextProvenanceItem[] = [];
  let excludedCount = 0;

  // ─────────────────────────────────────────────────────────────────────────
  // CATEGORY 1: Symptom Timeline & Health Events (allowSymptomTimeline)
  // ─────────────────────────────────────────────────────────────────────────
  if (effectivePrefs.allowSymptomTimeline) {
    try {
      const recentEvents = await HealthEvent.find({
        userId: userId, // Strict User Isolation
        isDeleted: false, // Strict Deleted Record Exclusion
      })
        .sort({ createdAt: -1 })
        .limit(20);

      const isGeneralSymptomQuery = detectedTopics.includes("symptom_general");

      for (const event of recentEvents) {
        const textToMatch = `${event.symptom || ""} ${event.value || ""} ${event.notes || ""} ${event.type}`;
        let relevance = calculateRelevance(
          textToMatch,
          event.type,
          detectedTopics,
          matchedKeywords,
          query
        );

        if (isGeneralSymptomQuery && event.status === "active") {
          relevance = { score: 0.85, reason: "Recent active recorded symptom" };
        } else if (isGeneralSymptomQuery) {
          relevance = { score: 0.70, reason: "Recorded symptom history" };
        }

        // Include if relevance >= 0.5 or (contextual referral and recent active event)
        if (relevance.score >= 0.5 || (isContextualReferral && event.status === "active" && relevance.score >= 0.3)) {
          candidateItems.push({
            type: (event.type as any) || "symptom",
            title: event.symptom || event.value || "Health Event",
            value: event.value || undefined,
            severity: event.severity || undefined,
            date: event.startDate ? event.startDate.toISOString().split("T")[0] : event.createdAt ? event.createdAt.toISOString().split("T")[0] : undefined,
            source: event.source || "USER_REPORTED",
            reportId: event.reportId ? event.reportId.toString() : undefined,
            relevanceScore: relevance.score,
            reason: relevance.reason,
          });
        } else {
          excludedCount++;
        }
      }
    } catch (eventErr) {
      console.error("[PersonalHealthContext] HealthEvent query error:", eventErr);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CATEGORY 2: Medications (allowMedications)
  // ─────────────────────────────────────────────────────────────────────────
  if (effectivePrefs.allowMedications) {
    try {
      const userMeds = await Medicine.find({
        userId: userId, // Strict User Isolation
        isDeleted: { $ne: true }, // Strict Deleted Record Exclusion
      })
        .sort({ createdAt: -1 })
        .limit(10);

      const isGeneralMedQuery = detectedTopics.includes("medication_general");
      const normQuery = query.toLowerCase();

      for (const med of userMeds) {
        const textToMatch = `${med.name} ${med.dose} ${med.time}`;
        const isMedDirectlyMentioned = normQuery.includes(med.name.toLowerCase());
        let relevance = calculateRelevance(
          textToMatch,
          "medication",
          detectedTopics,
          matchedKeywords,
          query
        );

        if (isMedDirectlyMentioned) {
          relevance = { score: 0.95, reason: `Direct mention of medication "${med.name}"` };
        } else if (isGeneralMedQuery) {
          relevance = { score: 0.85, reason: "Active recorded medication" };
        }

        if (relevance.score >= 0.5) {
          candidateItems.push({
            type: "medication",
            title: `${med.name} (${med.dose})`,
            value: `Timing: ${med.time}${med.taken ? " [Taken today]" : ""}`,
            date: med.createdAt ? med.createdAt.toISOString().split("T")[0] : undefined,
            source: (med.source as any) || "USER_REPORTED",
            relevanceScore: relevance.score,
            reason: relevance.reason,
          });
        } else {
          excludedCount++;
        }
      }
    } catch (medErr) {
      console.error("[PersonalHealthContext] Medicine query error:", medErr);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CATEGORY 3: Medical History & Allergies (allowHealthHistory)
  // ─────────────────────────────────────────────────────────────────────────
  if (effectivePrefs.allowHealthHistory && user) {
    const isGeneralConditionQuery = detectedTopics.includes("condition_general");
    const isGeneralAllergyQuery = detectedTopics.includes("allergy");
    const normQuery = query.toLowerCase();

    // Medical History Conditions
    if (user.medicalHistory && Array.isArray(user.medicalHistory)) {
      for (const h of user.medicalHistory) {
        const textToMatch = `${h.condition} ${h.notes || ""}`;
        let relevance = calculateRelevance(
          textToMatch,
          "condition",
          detectedTopics,
          matchedKeywords,
          query
        );

        if (isGeneralConditionQuery) {
          relevance = { score: 0.85, reason: "Diagnosed condition from medical history" };
        } else if (normQuery.includes(h.condition.toLowerCase())) {
          relevance = { score: 0.95, reason: `Direct mention of condition "${h.condition}"` };
        }

        if (relevance.score >= 0.5) {
          candidateItems.push({
            type: "condition",
            title: h.condition,
            value: h.notes || undefined,
            date: h.diagnosedDate || undefined,
            source: "USER_CONFIRMED",
            relevanceScore: relevance.score,
            reason: relevance.reason,
          });
        } else {
          excludedCount++;
        }
      }
    }

    // Allergies
    if (user.allergies && Array.isArray(user.allergies)) {
      for (const a of user.allergies) {
        const textToMatch = `${a.name} ${a.severity || ""}`;
        const isAllergyDirectlyMentioned = normQuery.includes(a.name.toLowerCase()) || (a.name.toLowerCase().includes("penicillin") && normQuery.includes("penicillin"));
        let relevance = calculateRelevance(
          textToMatch,
          "allergy",
          detectedTopics,
          matchedKeywords,
          query
        );

        if (isAllergyDirectlyMentioned) {
          relevance = { score: 0.95, reason: `Direct match with allergy "${a.name}"` };
        } else if (isGeneralAllergyQuery) {
          relevance = { score: 0.85, reason: "Patient allergy profile" };
        }

        if (relevance.score >= 0.5) {
          candidateItems.push({
            type: "allergy",
            title: `Allergy: ${a.name}`,
            severity: a.severity || undefined,
            source: "USER_CONFIRMED",
            relevanceScore: relevance.score,
            reason: relevance.reason,
          });
        } else {
          excludedCount++;
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CATEGORY 4: Medical Reports & Lab Results (allowMedicalReports)
  // ─────────────────────────────────────────────────────────────────────────
  if (effectivePrefs.allowMedicalReports) {
    try {
      const reports = await ReportHistory.find({
        userId: userId, // Strict User Isolation
        isSample: { $ne: true },
      })
        .sort({ createdAt: -1 })
        .limit(5);

      const normQuery = query.toLowerCase();

      for (const rep of reports) {
        const reportTitle = rep.title || "Medical Report";
        const reportDate = rep.createdAt ? new Date(rep.createdAt).toISOString().split("T")[0] : undefined;

        // Check overall report summary/title relevance
        const summaryMatch = calculateRelevance(
          `${reportTitle} ${rep.summary || ""}`,
          "lab_result",
          detectedTopics,
          matchedKeywords,
          query
        );

        // Check specific lab parameters
        let parameterMatched = false;
        if (rep.parameters && Array.isArray(rep.parameters)) {
          for (const param of rep.parameters) {
            const paramNameLower = (param.name || "").toLowerCase();
            const isHbMatch = (normQuery.includes("hb") || normQuery.includes("hemoglobin")) && (paramNameLower.includes("hemoglobin") || paramNameLower.includes("hb"));
            const isSugarMatch = (normQuery.includes("sugar") || normQuery.includes("fasting") || normQuery.includes("glucose") || normQuery.includes("hba1c")) && (paramNameLower.includes("sugar") || paramNameLower.includes("fasting") || paramNameLower.includes("glucose") || paramNameLower.includes("hba1c"));
            const isParamDirect = normQuery.includes(paramNameLower);

            const paramText = `${param.name} ${param.value} ${param.status} ${param.normalRange || ""}`;
            let paramRelevance = calculateRelevance(
              paramText,
              "lab_result",
              detectedTopics,
              matchedKeywords,
              query
            );

            if (isHbMatch || isSugarMatch || isParamDirect) {
              paramRelevance = { score: 0.95, reason: `Direct match for lab parameter "${param.name}"` };
            }

            if (paramRelevance.score >= 0.5) {
              candidateItems.push({
                type: "lab_result",
                title: `${param.name}: ${param.value} (${param.status})`,
                value: `Ref: ${param.normalRange || "N/A"}. Report: "${reportTitle}"`,
                date: reportDate,
                source: "REPORT_EXTRACTED",
                reportId: rep._id ? rep._id.toString() : undefined,
                relevanceScore: paramRelevance.score,
                reason: paramRelevance.reason,
              });
              parameterMatched = true;
            }
          }
        }

        if (!parameterMatched && summaryMatch.score >= 0.6) {
          candidateItems.push({
            type: "lab_result",
            title: reportTitle,
            value: rep.summary ? rep.summary.substring(0, 150) + "..." : undefined,
            date: reportDate,
            source: "REPORT_EXTRACTED",
            reportId: rep._id ? rep._id.toString() : undefined,
            relevanceScore: summaryMatch.score,
            reason: summaryMatch.reason,
          });
        } else if (!parameterMatched && summaryMatch.score < 0.6) {
          excludedCount++;
        }
      }
    } catch (repErr) {
      console.error("[PersonalHealthContext] Report query error:", repErr);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONTEXT MINIMIZATION & PROVENANCE FORMATTING
  // ─────────────────────────────────────────────────────────────────────────
  // Sort candidates by relevance score descending
  candidateItems.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Cap at top 4 most relevant items (Strict Context Minimization)
  const finalItems = candidateItems.slice(0, 4);

  if (finalItems.length === 0) {
    return {
      hasContext: false,
      contextText: "",
      provenance: [],
      itemCount: 0,
      excludedCount,
      appliedPreferences: effectivePrefs,
      resolvedTopic: detectedTopics.join(", ") || "general",
      telemetry: {
        resolverInvoked: true,
        userIdScoped: true,
        elapsedMs: Date.now() - startTime,
      },
    };
  }

  // Format clearly separated PERSONAL HEALTH CONTEXT with provenance metadata and clinical directives
  const contextLines = [
    `═══════════════════════════════════════════════`,
    `PERSONAL HEALTH CONTEXT (PATIENT-AUTHORIZED)`,
    `═══════════════════════════════════════════════`,
    `NOTICE TO AI ASSISTANT:`,
    `- The following information contains health records explicitly provided and authorized by this patient.`,
    `- Treat patient records as background context and evidence, NOT as an autonomous clinical diagnosis.`,
    `- "USER_REPORTED" represents patient-described symptoms or information.`,
    `- "REPORT_EXTRACTED" represents automated extraction from patient-uploaded documents and requires clinical correlation.`,
    `- "USER_CONFIRMED" represents patient-verified records.`,
    `- "SYSTEM_DERIVED" represents calculated metrics and must NEVER be presented as confirmed medical fact.`,
    `- NEVER use stored medication records as permission to change dosages or prescribe new drugs.`,
    `- If personal context conflicts with general clinical guidelines, explain the distinction cautiously and recommend professional evaluation.`,
    ``,
    `RELEVANT PERSONAL HEALTH RECORDS:`,
  ];

  finalItems.forEach((item, index) => {
    contextLines.push(
      `${index + 1}. [${item.type.toUpperCase()}] ${item.title}`
    );
    if (item.value) {
      contextLines.push(`   Details: ${item.value}`);
    }
    if (item.severity) {
      contextLines.push(`   Severity: ${item.severity}`);
    }
    if (item.date) {
      contextLines.push(`   Recorded Date: ${item.date}`);
    }
    contextLines.push(`   Provenance / Source: ${item.source}`);
    if (item.reportId) {
      contextLines.push(`   Report Reference ID: ${item.reportId}`);
    }
  });

  contextLines.push(`═══════════════════════════════════════════════`);

  return {
    hasContext: true,
    contextText: contextLines.join("\n"),
    provenance: finalItems,
    itemCount: finalItems.length,
    excludedCount,
    appliedPreferences: effectivePrefs,
    resolvedTopic: detectedTopics.join(", ") || "general",
    telemetry: {
      resolverInvoked: true,
      userIdScoped: true,
      elapsedMs: Date.now() - startTime,
    },
  };
}
