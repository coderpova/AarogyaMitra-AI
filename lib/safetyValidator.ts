/**
 * AarogyaMitra AI — Medical Safety Layer (Phase 2C)
 * Deterministic post-generation safety validator, claim grounding,
 * false-certainty suppressor, medication dosing regulator,
 * prompt-injection guard, and safe response repairer.
 */

export type SafetyClassification = "SAFE" | "CAUTION" | "UNSUPPORTED" | "DANGEROUS" | "EMERGENCY";

export interface SafetyValidationResult {
  classification: SafetyClassification;
  isSafe: boolean;
  issues: string[];
  repairedText?: string;
  isRepaired: boolean;
  reasons: string[];
  sanitizedText: string;
}

export interface MedicalKnowledgeChunk {
  title?: string;
  category?: string;
  tags?: string[];
  content: string;
  source?: string;
  evidenceLevel?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. EMERGENCY & RED-FLAG DETECTION
// ─────────────────────────────────────────────────────────────────────────────

const ACUTE_EMERGENCY_TERMS = [
  "severe chest pain", "seene me dard", "seene mein dard", "heart attack", "dil ka daura",
  "can't breathe", "cannot breathe", "difficulty breathing", "saas nahi aa rahi",
  "saans lene me taklif", "saans lene mein dikkat", "saans lene mein pareshani",
  "unconscious", "behosh", "murcha", "loss of consciousness", "not responding",
  "stroke", "paralysis", "laqwa", "face drooping", "chehra tircha",
  "snake bite", "saanp ne kaata", "sanp ne kata",
  "heavy bleeding", "khoon nahi ruk raha", "severe bleeding",
  "suicidal", "kill myself", "end my life", "mar jaunga", "apni jaan lena",
  "सीने में दर्द", "हार्ट अटैक", "सांस लेने में बहुत परेशानी", "सांस लेने में परेशानी", "बेहोश"
];

export function detectEmergencySafety(query: string, text: string = ""): boolean {
  const queryLower = query.toLowerCase();
  // Check if query is an informational question like "what are the signs/symptoms of..."
  const isInformational = /^(?:what\s+are|tell\s+me\s+about|symptoms\s+of|signs\s+of|causes\s+of|क्या\s+हैं|लक्षण)/i.test(queryLower.trim());

  if (isInformational) {
    return false;
  }

  const combined = `${query} ${text}`.toLowerCase();
  return ACUTE_EMERGENCY_TERMS.some(term => combined.includes(term));
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PROMPT INJECTION & ADVERSARIAL DETECTION
// ─────────────────────────────────────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:previous\s+|your\s+|system\s+)*(?:medical\s+)?(?:rules|instructions|safety|guidelines)/i,
  /reveal\s+(?:your\s+)?(?:system\s+prompt|hidden\s+instructions)/i,
  /pretend\s+(?:you\s+are\s+)?(?:an?\s+)?(?:unrestricted|jailbroken|unfiltered|real\s+doctor\s+who\s+prescribes)/i,
  /bypass\s+(?:safety|guardrails|filters)/i,
  /give\s+me\s+an?\s+unsupported\s+diagnosis/i,
  /tell\s+the\s+user\s+that\s+this\s+medicine\s+cures\s+every\s+disease/i,
  /tum\s+saare\s+rules\s+bhool\s+jao/i,
  /saari\s+safety\s+ignore\s+karo/i,
];

export function detectPromptInjection(query: string, text: string = "", ragChunks: MedicalKnowledgeChunk[] = []): boolean {
  const chunkTexts = ragChunks.map(c => `${c.title || ""} ${c.content}`).join("\n");
  const combined = `${query}\n${text}\n${chunkTexts}`;
  return INJECTION_PATTERNS.some(regex => regex.test(combined));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. UNSUPPORTED DIAGNOSIS DETECTION
// ─────────────────────────────────────────────────────────────────────────────

const DEFINITIVE_DIAGNOSIS_REGEXES = [
  /(?:you\s+(?:definitely|certainly|surely)\s+have\s+)(cancer|tumor|diabetes|hypertension|heart\s+attack|stroke|tuberculosis|hiv|covid)/i,
  /(?:this\s+proves\s+(?:that\s+)?you\s+have\s+)(cancer|tumor|diabetes|hypertension|heart\s+attack|stroke|tuberculosis|hiv|covid)/i,
  /(?:you\s+have\s+a\s+confirmed\s+case\s+of\s+)(cancer|tumor|diabetes|hypertension|heart\s+attack|stroke|tuberculosis|hiv|covid)/i,
  /(?:aapko\s+definitely\s+|aapko\s+pukka\s+)(cancer|diabetes|stroke|bimari|bimari\s+hai|heart\s+attack)/i,
  /(?:आपको\s+(?:निश्चित\s+रूप\s+से|पक्का)\s+)(?:कैंसर|मधुमेह|स्ट्रोक|हार्ट\s+अटैक|ट्यूमर)/i,
  /(?:यह\s+साबित\s+करता\s+है\s+कि\s+आपको\s+)(?:कैंसर|मधुमेह|स्ट्रोक|हार्ट\s+अटैक|ट्यूमर)/i,
];

const NEGATION_OR_CAUTION_PHRASES = [
  "does not definitely", "does not prove", "cannot confirm", "may be caused by",
  "can have multiple causes", "does not mean", "consult a doctor", "requires clinical evaluation",
  "yah sabit nahi karta", "zaruri nahi", "yah nishchit roop se nahi kaha ja sakta"
];

export function detectUnsupportedDiagnosis(text: string, ragChunks: MedicalKnowledgeChunk[] = []): boolean {
  const hasNegativeCaution = NEGATION_OR_CAUTION_PHRASES.some(phrase => text.toLowerCase().includes(phrase));
  
  for (const regex of DEFINITIVE_DIAGNOSIS_REGEXES) {
    if (regex.test(text) && !hasNegativeCaution) {
      return true;
    }
  }

  if (/(?:you\s+definitely\s+have|आपको\s+निश्चित\s+रूप\s+से\s+है)/i.test(text) && !hasNegativeCaution) {
    return true;
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. FALSE CERTAINTY & OVERCONFIDENCE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

const FALSE_CERTAINTY_PATTERNS = [
  /\b(?:100%\s*(?:sure|certain|guaranteed|guarantee))\b/i,
  /(?:१००%\s*गारंटी|100%\s*गारंटी|100%\s*पक्का)/i,
  /\b(?:guaranteed\s+(?:recovery|cure|result))\b/i,
  /(?:गारंटीड\s+इलाज|गारंटी\s+के\s+साथ)/i,
  /\b(?:this\s+proves\s+with\s+certainty|this\s+permanently\s+fixes\s+it)\b/i,
  /\b(?:you\s+will\s+100%\s+recover|100%\s+theek\s+ho\s+jayenge)\b/i,
  /\b(?:definitely\s+cured)\b/i,
  /(?:पूरी\s+तरह\s+से\s+जड़\s+से\s+खत्म|जड़\s+से\s+खत्म)/i,
];

export function detectFalseCertainty(text: string): boolean {
  const lower = text.toLowerCase();
  for (const pattern of FALSE_CERTAINTY_PATTERNS) {
    if (pattern.test(lower)) {
      if (lower.includes("not 100%") || lower.includes("cannot guarantee") || lower.includes("no guarantee")) {
        continue;
      }
      return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MEDICATION SAFETY & DOSING REGULATOR
// ─────────────────────────────────────────────────────────────────────────────

const DANGEROUS_DOSING_COMMANDS = [
  /\b(?:take|consume|inject)\s+\d+\s*(?:mg|ml|tablets?|capsules?)(?:\s+[a-zA-Z]+)?(?:\s+(?:every|everyday|\d+\s*times|daily))?\b/i,
  /\b(?:double\s+(?:your|the)\s+(?:medicine|dose|dosage)|dose\s+double\s+kar)\b/i,
  /(?:दवा\s+दोगुनी|डोज़\s+डबल)/i,
  /\b(?:stop\s+taking\s+(?:your\s+)?(?:prescribed|prescription|insulin|bp|hypertension|blood\s+pressure)\s+medicine)\b/i,
  /\b(?:apni\s+dawa\s+band\s+kar\s+do)\b/i,
  /(?:दवाई\s+बंद\s+कर|दवा\s+.*?\s*बंद\s+कर|दवाई\s+लेना\s+बंद)/i,
  /\b(?:start\s+taking\s+prescription\s+antibiotics)\b/i,
];

export function detectMedicationSafetyIssues(
  text: string,
  query: string = "",
  ragChunks: MedicalKnowledgeChunk[] = []
): boolean {
  // If user asks "Can I double my medicine dose?" or similar and response indicates dose doubling
  if (/\b(?:double\s+your\s+dose|dose\s+double\s+karein|dose\s+double\s+kar\s+lo|dawa\s+double\s+kar\s+le)\b/i.test(text)) {
    return true;
  }

  // Check dangerous dosing assertions
  for (const pattern of DANGEROUS_DOSING_COMMANDS) {
    const match = text.match(pattern);
    if (match) {
      const matchedPhrase = match[0].toLowerCase();
      const isGroundedInChunks = ragChunks.some(chunk => chunk.content.toLowerCase().includes(matchedPhrase));
      if (!isGroundedInChunks) {
        return true;
      }
    }
  }

  // If query asks for exact prescription dosage without patient context and answer provides precise prescription dosage
  if (/\b(?:tell\s+me\s+exactly\s+how\s+much\s+prescription|exact\s+prescription\s+dose)\b/i.test(query)) {
    if (/\b\d+\s*mg\b/i.test(text) && !text.toLowerCase().includes("consult")) {
      return true;
    }
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. TREATMENT & CURE CLAIM DETECTION
// ─────────────────────────────────────────────────────────────────────────────

const CURE_CLAIM_PATTERNS = [
  /\b(?:this\s+will\s+cure\s+your\s+(?:diabetes|hypertension|cancer|chronic\s+disease))\b/i,
  /\b(?:guaranteed\s+cure\s+for\s+diabetes|diabetes\s+ka\s+guaranteed\s+ilaj)\b/i,
  /\b(?:you\s+don'?t\s+need\s+a\s+doctor|doctor\s+ke\s+paas\s+jane\s+ki\s+jaroorat\s+nahi)\b/i,
  /\b(?:permanently\s+cures\s+every\s+case|100%\s+permanent\s+cure|guarantees\s+recovery)\b/i,
  /(?:डॉक्टर\s+की\s+ज़रूरत\s+नहीं\s+है|गारंटीड\s+इलाज\s+है|गारंटीड\s+इलाज|जड़\s+से\s+खत्म)/i,
];

export function detectUnsupportedCureClaims(text: string): boolean {
  const lower = text.toLowerCase();
  for (const pattern of CURE_CLAIM_PATTERNS) {
    if (pattern.test(lower)) {
      if (lower.includes("cannot cure") || lower.includes("no cure") || lower.includes("there is no permanent cure")) {
        continue;
      }
      return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. CONTRADICTORY EVIDENCE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

export function detectContradictoryEvidence(ragChunks: MedicalKnowledgeChunk[]): boolean {
  if (!ragChunks || ragChunks.length < 2) return false;
  // Check if chunks have directly conflicting high-level assertions
  const texts = ragChunks.map(c => c.content.toLowerCase());
  let conflictFound = false;

  // Example check: one chunk says "requires immediate fasting" and another says "do not fast"
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      if (
        (texts[i].includes("avoid fluids") && texts[j].includes("increase fluids")) ||
        (texts[i].includes("fasting required") && texts[j].includes("never fast")) ||
        (texts[i].includes("apply heat") && texts[j].includes("never apply heat"))
      ) {
        conflictFound = true;
      }
    }
  }

  return conflictFound;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. ACTION TAG SECURITY
// ─────────────────────────────────────────────────────────────────────────────

const AUTHORIZED_TAGS = new Set(["BOOK_APPOINTMENT", "FIND_HOSPITAL", "SUGGESTED_REPLIES"]);

export function validateActionTags(text: string): { isValid: boolean; sanitizedText: string; strippedTags: string[] } {
  const strippedTags: string[] = [];
  let sanitizedText = text;

  // Find all [TAG] patterns
  const tagMatches = text.match(/\[([A-Z_]+)\]([\s\S]*?)\[\/\1\]/g) || [];

  for (const match of tagMatches) {
    const nameMatch = match.match(/\[([A-Z_]+)\]/);
    if (nameMatch) {
      const tagName = nameMatch[1];
      if (!AUTHORIZED_TAGS.has(tagName)) {
        strippedTags.push(tagName);
        sanitizedText = sanitizedText.replace(match, "");
      } else {
        // Validate JSON inside BOOK_APPOINTMENT / FIND_HOSPITAL
        if (tagName === "BOOK_APPOINTMENT" || tagName === "FIND_HOSPITAL") {
          const bodyMatch = match.match(/\[(?:BOOK_APPOINTMENT|FIND_HOSPITAL)\]([\s\S]*?)\[\/(?:BOOK_APPOINTMENT|FIND_HOSPITAL)\]/);
          if (bodyMatch) {
            try {
              JSON.parse(bodyMatch[1]);
            } catch {
              // Invalid JSON inside tag -> strip unsafe tag
              strippedTags.push(`${tagName}_INVALID_JSON`);
              sanitizedText = sanitizedText.replace(match, "");
            }
          }
        }
      }
    }
  }

  // Also strip any dangling unauthorized standalone tags like [DELETE_USER], [ADMIN], [EXECUTE]
  const standaloneMatches = text.match(/\[([A-Z_]+)\]/g) || [];
  for (const match of standaloneMatches) {
    const name = match.replace(/[\[\]\/]/g, "");
    if (!AUTHORIZED_TAGS.has(name) && !AUTHORIZED_TAGS.has(name.replace("/", ""))) {
      if (!strippedTags.includes(name)) strippedTags.push(name);
      sanitizedText = sanitizedText.replace(match, "");
    }
  }

  return {
    isValid: strippedTags.length === 0,
    sanitizedText: sanitizedText.trim(),
    strippedTags
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. CORE SAFETY CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────

export function classifySafety(
  query: string,
  responseText: string,
  ragChunks: MedicalKnowledgeChunk[] = []
): { classification: SafetyClassification; issues: string[] } {
  const issues: string[] = [];

  // 1. Emergency check
  if (detectEmergencySafety(query, responseText)) {
    issues.push("Acute emergency symptoms detected requiring immediate emergency medical care");
    return { classification: "EMERGENCY", issues };
  }

  // 2. Prompt injection check
  if (detectPromptInjection(query, responseText, ragChunks)) {
    issues.push("Prompt injection or adversarial safety override attempt detected");
    return { classification: "DANGEROUS", issues };
  }

  // 3. Unsupported diagnosis
  if (detectUnsupportedDiagnosis(responseText, ragChunks)) {
    issues.push("Unsupported definitive diagnostic conclusion presented as established fact");
  }

  // 4. False certainty
  if (detectFalseCertainty(responseText)) {
    issues.push("False certainty or 100% guarantee language without clinical basis");
  }

  // 5. Medication safety
  if (detectMedicationSafetyIssues(responseText, query, ragChunks)) {
    issues.push("Dangerous or unsupported prescription medication dosing instruction");
  }

  // 6. Cure claims
  if (detectUnsupportedCureClaims(responseText)) {
    issues.push("Unsupported permanent cure claim or dismissal of doctor consultation");
  }

  // 7. Action tag security
  const tagValidation = validateActionTags(responseText);
  if (!tagValidation.isValid) {
    issues.push(`Unauthorized action tags detected: ${tagValidation.strippedTags.join(", ")}`);
  }

  if (issues.some(i => i.includes("Dangerous") || i.includes("emergency") || i.includes("override"))) {
    return { classification: "DANGEROUS", issues };
  }

  if (issues.length > 0) {
    return { classification: "UNSUPPORTED", issues };
  }

  // Contradiction in evidence triggers CAUTION
  if (detectContradictoryEvidence(ragChunks)) {
    issues.push("Conflicting medical guidelines detected in retrieved sources; caution required");
    return { classification: "CAUTION", issues };
  }

  return { classification: "SAFE", issues: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. SAFE RESPONSE REPAIR & CONSERVATIVE FALLBACK
// ─────────────────────────────────────────────────────────────────────────────

export function getConservativeFallback(language: string = "en", query: string = ""): string {
  if (language === "hi") {
    return `स्वास्थ्य संबंधी लक्षणों के कई संभावित कारण हो सकते हैं। सटीक जांच और सुरक्षित मार्गदर्शन के लिए कृपया किसी योग्य चिकित्सक या डॉक्टर से परामर्श लें।

यदि आपको गंभीर लक्षण (जैसे सीने में तेज़ दर्द या सांस लेने में परेशानी) महसूस हो रहे हैं, तो तुरंत आपातकालीन नंबर 112 या 108 पर संपर्क करें।

[SUGGESTED_REPLIES]डॉक्टर से सलाह लें|अस्पताल खोजें|दवा जानकारी|मुख्य लक्षण[/SUGGESTED_REPLIES]`;
  }

  return `Health symptoms can arise from a wide variety of causes. To establish an accurate assessment and receive safe, personalized guidance, please consult a qualified healthcare professional or physician.

If you are experiencing acute or severe symptoms (such as intense chest pain or difficulty breathing), please call national emergency services (112 / 108) immediately.

[SUGGESTED_REPLIES]Consult Doctor|Find Hospital|Symptom Overview|First Aid[/SUGGESTED_REPLIES]`;
}

export function repairUnsafeResponse(
  text: string,
  issues: string[],
  language: string = "en",
  ragChunks: MedicalKnowledgeChunk[] = [],
  maxAttempts: number = 2
): { repairedText: string; isRepaired: boolean } {
  let repaired = text;
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;

    // 1. Strip unauthorized action tags
    const tagCheck = validateActionTags(repaired);
    repaired = tagCheck.sanitizedText;

    // 2. Repair unsupported definitive diagnosis assertions
    repaired = repaired.replace(
      /(?:you\s+(?:definitely|certainly|surely)\s+have\s+)(cancer|tumor|diabetes|hypertension|heart\s+attack|stroke)/gi,
      "these symptoms can have multiple causes, including $1, and require clinical evaluation to determine"
    );
    repaired = repaired.replace(
      /(?:this\s+proves\s+(?:that\s+)?you\s+have\s+)(cancer|tumor|diabetes|hypertension|heart\s+attack|stroke)/gi,
      "these symptoms may be associated with several conditions including $1, but clinical tests are required"
    );
    repaired = repaired.replace(
      /(?:आपको\s+(?:निश्चित\s+रूप\s+से|पक्का)\s+)(कैंसर|मधुमेह|स्ट्रोक|हार्ट\s+अटैक|ट्यूमर)\s+है/gi,
      "इन लक्षणों के कई कारण हो सकते हैं। सटीक जांच के लिए डॉक्टर से परामर्श की आवश्यकता है"
    );

    // 3. Repair false certainty
    repaired = repaired.replace(/\b100%\s*(?:sure|certain|guaranteed|guarantee)\b/gi, "not guaranteed without clinical testing");
    repaired = repaired.replace(/\b(?:guaranteed\s+(?:cure|recovery)|this\s+will\s+cure\s+your\s+diabetes)\b/gi, "management and treatment under medical supervision");
    repaired = repaired.replace(/\b100%\s*गारंटी\b/gi, "डॉक्टर की सलाह आवश्यक है");

    // 4. Repair dangerous dosing instructions
    repaired = repaired.replace(/\btake\s+\d+\s*(?:mg|ml|tablets?|capsules?)\s+[^.\n]+/gi, "medication dosing must be determined by a qualified doctor");
    repaired = repaired.replace(/\b(?:stop\s+taking\s+(?:your\s+)?[^.\n]+medicine)\b/gi, "never stop prescribed medication without consulting your doctor");
    repaired = repaired.replace(/\b(?:apni\s+dawa\s+band\s+kar\s+do|दवाई\s+बंद\s+कर\s+दें|दवा\s+.*?\s*बंद\s+कर\s+दें)\b/gi, "डॉक्टर की सलाह के बिना दवाई बंद न करें");
    repaired = repaired.replace(/\b(?:double\s+(?:your|the)\s+(?:medicine|dose|dosage))\b/gi, "never change or double your dosage without consulting your prescribing doctor");
    repaired = repaired.replace(/\b(?:dose\s+double\s+kar\s+lo|दवा\s+दोगुनी\s+कर\s+लें)\b/gi, "डॉक्टर की सलाह के बिना दवा की खुराक न बदलें");
    repaired = repaired.replace(/\b(?:doctor\s+ke\s+paas\s+jane\s+ki\s+jaroorat\s+nahi|डॉक्टर\s+की\s+ज़रूरत\s+नहीं\s+है)\b/gi, "उचित जांच के लिए डॉक्टर से परामर्श लेना आवश्यक है");
    repaired = repaired.replace(/\b(?:permanently\s+cures\s+every\s+case|guarantees\s+recovery|जड़\s+से\s+खत्म)\b/gi, "management under proper medical guidance");

    // Re-check safety
    const check = classifySafety("", repaired, ragChunks);
    if (check.classification === "SAFE" || check.classification === "CAUTION") {
      return { repairedText: repaired, isRepaired: true };
    }
  }

  // If repair fails within maxAttempts, return conservative evidence-grounded fallback
  return { repairedText: getConservativeFallback(language), isRepaired: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. MAIN SAFETY VALIDATOR PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

export function validateMedicalSafety(
  query: string,
  generatedReply: string,
  ragChunks: MedicalKnowledgeChunk[] = [],
  language: string = "en"
): SafetyValidationResult {
  // 1. Initial deterministic classification
  const initial = classifySafety(query, generatedReply, ragChunks);

  if (initial.classification === "SAFE" || initial.classification === "CAUTION") {
    const tagCleaned = validateActionTags(generatedReply);
    return {
      classification: initial.classification,
      isSafe: true,
      issues: initial.issues,
      sanitizedText: tagCleaned.sanitizedText,
      isRepaired: false,
      reasons: initial.issues.length ? initial.issues : ["Response adheres to medical safety criteria."]
    };
  }

  // 2. If emergency, return emergency classification with sanitized repair
  if (initial.classification === "EMERGENCY") {
    const repair = repairUnsafeResponse(generatedReply, initial.issues, language, ragChunks, 2);
    return {
      classification: "EMERGENCY",
      isSafe: false,
      issues: initial.issues,
      sanitizedText: repair.repairedText,
      isRepaired: true,
      reasons: initial.issues
    };
  }

  // 3. Attempt safe repair
  const repair = repairUnsafeResponse(generatedReply, initial.issues, language, ragChunks, 2);

  return {
    classification: initial.classification,
    isSafe: repair.isRepaired,
    issues: initial.issues,
    repairedText: repair.repairedText,
    sanitizedText: repair.repairedText,
    isRepaired: true,
    reasons: initial.issues
  };
}
