/**
 * AarogyaMitra AI — Health Assistant Brain
 * Central logic for doctor-like conversation flow, emergency detection,
 * suggested replies parsing, and cross-module integration actions.
 */

// ─────────────────────────────────────────────────────────────────────────────
// EMERGENCY DETECTION
// ─────────────────────────────────────────────────────────────────────────────

interface EmergencyResult {
  isEmergency: boolean;
  responseEn: string | null;
  responseHi: string | null;
}

const EMERGENCY_PATTERNS: Array<{
  patterns: string[];
  en: string;
  hi: string;
}> = [
  {
    patterns: [
      "chest pain", "seene me dard", "heart attack", "dil ka daura",
      "angina", "left chest pain", "dil me dard",
    ],
    en: `🚨 EMERGENCY — Possible Heart Emergency

Call 112 or 108 immediately!

While waiting for help:
✅ Sit the person down — do NOT let them walk
✅ Loosen tight clothing around chest and neck
✅ If conscious and not allergic, give 1 Aspirin (325mg) to chew
❌ Do NOT give food or water
❌ Do NOT leave them alone

National Emergency: 112 | Ambulance: 108`,
    hi: `🚨 आपातकाल — संभावित हृदय आपातकाल

तुरंत 112 या 108 पर कॉल करें!

मदद आने तक:
✅ व्यक्ति को बैठाएं — चलने न दें
✅ छाती और गर्दन के तंग कपड़े ढीले करें
✅ अगर होश में हो और एलर्जी न हो तो 1 Aspirin (325mg) चबाने दें
❌ खाना या पानी न दें
❌ अकेला न छोड़ें

राष्ट्रीय आपातकाल: 112 | एम्बुलेंस: 108`,
  },
  {
    patterns: [
      "can't breathe", "saas nahi aa rahi", "breathless", "suffocating",
      "ghut raha", "breathing stopped", "saans band",
      "shortness of breath", "saans ki taklif",
    ],
    en: `🚨 EMERGENCY — Breathing Difficulty

Call 112 / 108 immediately!

While waiting:
✅ Keep person upright or sitting — DO NOT lay them flat
✅ Loosen any tight clothing around neck and chest
✅ Move to fresh air if possible
✅ If they have an inhaler — use it now (2-4 puffs)
❌ Do NOT give food or water

National Emergency: 112 | Ambulance: 108`,
    hi: `🚨 आपातकाल — सांस लेने में कठिनाई

तुरंत 112 / 108 पर कॉल करें!

मदद आने तक:
✅ व्यक्ति को सीधे बैठाएं — लेटाएं नहीं
✅ गर्दन और छाती के तंग कपड़े ढीले करें
✅ हो सके तो ताज़ी हवा में ले जाएं
✅ अगर इनहेलर है — अभी उपयोग करें (2-4 पफ)
❌ खाना या पानी न दें

राष्ट्रीय आपातकाल: 112 | एम्बुलेंस: 108`,
  },
  {
    patterns: [
      "snake bite", "sanp ne kaata", "saanp ne kaata",
      "snake poison", "saap ka zeher",
    ],
    en: `🚨 EMERGENCY — Snake Bite

Call 112 / 108 immediately!

✅ Keep the person STILL and CALM — movement spreads venom faster
✅ Keep the bitten limb BELOW heart level
✅ Remove rings, watches, tight clothing near the bite
❌ DO NOT cut or suck the bite wound
❌ DO NOT apply tourniquet or ice

Rush to nearest Government Hospital — anti-venom is ONLY available there!
National Emergency: 112 | Ambulance: 108`,
    hi: `🚨 आपातकाल — सांप का काटना

तुरंत 112 / 108 पर कॉल करें!

✅ व्यक्ति को स्थिर और शांत रखें — हिलने से ज़हर तेज़ी से फैलता है
✅ काटे गए अंग को दिल के स्तर से नीचे रखें
✅ काट के पास की अंगूठी, घड़ी, तंग कपड़े हटाएं
❌ काटे को काटें या चूसें नहीं
❌ टूर्निकेट या बर्फ न लगाएं

तुरंत निकटतम सरकारी अस्पताल जाएं — एंटी-वेनम केवल वहीं मिलता है!
राष्ट्रीय आपातकाल: 112 | एम्बुलेंस: 108`,
  },
  {
    patterns: [
      "unconscious", "behosh", "faint", "murcha",
      "not responding", "coma",
    ],
    en: `🚨 EMERGENCY — Person Unconscious / Not Responding

Call 112 / 108 immediately!

✅ Check if person is breathing — watch chest rise
✅ Place in recovery position (on side) if breathing
✅ If NOT breathing — start CPR if you know how
✅ Loosen tight clothing
❌ Do NOT give anything by mouth

National Emergency: 112 | Ambulance: 108`,
    hi: `🚨 आपातकाल — व्यक्ति बेहोश / कोई प्रतिक्रिया नहीं

तुरंत 112 / 108 पर कॉल करें!

✅ जांचें कि व्यक्ति सांस ले रहा है — छाती का उठना देखें
✅ अगर सांस आ रही है तो करवट से लेटाएं
✅ अगर सांस नहीं आ रही — CPR जानते हों तो शुरू करें
✅ तंग कपड़े ढीले करें
❌ मुंह से कुछ न दें

राष्ट्रीय आपातकाल: 112 | एम्बुलेंस: 108`,
  },
  {
    patterns: [
      "heavy bleeding", "bahut khoon", "blood not stopping",
      "khoon nahi ruk raha", "spurting blood",
    ],
    en: `🚨 EMERGENCY — Severe Bleeding

Call 112 / 108 immediately!

✅ Apply FIRM, DIRECT pressure with a clean cloth — do NOT remove it
✅ If bleeding is on a limb — elevate above heart level
✅ Keep applying pressure — add more cloth on top if soaked through
❌ Do NOT remove embedded objects from wounds

National Emergency: 112 | Ambulance: 108`,
    hi: `🚨 आपातकाल — अत्यधिक रक्तस्राव

तुरंत 112 / 108 पर कॉल करें!

✅ साफ कपड़े से मज़बूत, सीधा दबाव डालें — कपड़ा न हटाएं
✅ अगर अंग पर है तो दिल से ऊपर उठाएं
✅ दबाव बनाए रखें — खून निकले तो ऊपर और कपड़ा रखें
❌ घाव से फंसी चीज़ें न निकालें

राष्ट्रीय आपातकाल: 112 | एम्बुलेंस: 108`,
  },
  {
    patterns: [
      "stroke", "paralysis", "laqwa", "face drooping",
      "chehra tircha", "sudden arm weakness", "speech difficulty",
    ],
    en: `🚨 EMERGENCY — Possible Stroke (Brain Attack)

Use the FAST test:
🔴 Face — Is one side drooping?
🔴 Arms — Can they raise both arms equally?
🔴 Speech — Is speech slurred or confused?
🔴 Time — Call 112 / 108 NOW!

✅ Keep person lying down with head slightly elevated
✅ Note the exact time symptoms started
❌ Do NOT give food, water, or medicines

National Emergency: 112 | Ambulance: 108`,
    hi: `🚨 आपातकाल — संभावित स्ट्रोक (दिमागी दौरा)

FAST टेस्ट करें:
🔴 Face (चेहरा) — क्या एक तरफ झुक रहा है?
🔴 Arms (बांहें) — क्या दोनों बांहें समान रूप से उठा सकते हैं?
🔴 Speech (बोलना) — क्या बोलना लड़खड़ा रहा है?
🔴 Time (समय) — अभी 112 / 108 पर कॉल करें!

✅ व्यक्ति को सिर थोड़ा ऊंचा करके लेटाएं
✅ लक्षण शुरू होने का सटीक समय नोट करें
❌ खाना, पानी या दवाई न दें

राष्ट्रीय आपातकाल: 112 | एम्बुलेंस: 108`,
  },
  {
    patterns: [
      "labour pain", "prasav peeda", "water broke",
      "paani toot gaya", "bleeding pregnancy",
    ],
    en: `🚨 EMERGENCY — Pregnancy Emergency

Call 112 / 108 immediately!

✅ Help the mother lie on her left side — this improves blood flow to baby
✅ Keep her calm and breathing slowly
✅ If water has broken, note the time
❌ Do NOT give food or water if going to hospital

Go to nearest hospital with maternity ward immediately!
National Emergency: 112 | Ambulance: 108 | Janani Shishu Suraksha: 104`,
    hi: `🚨 आपातकाल — गर्भावस्था आपातकाल

तुरंत 112 / 108 पर कॉल करें!

✅ माँ को बाईं तरफ करवट से लेटाएं — इससे बच्चे को रक्त प्रवाह बेहतर होता है
✅ शांत रखें और धीरे सांस लेने में मदद करें
✅ अगर पानी टूटा हो तो समय नोट करें
❌ अस्पताल जाना हो तो खाना या पानी न दें

तुरंत निकटतम प्रसूति वार्ड वाले अस्पताल जाएं!
राष्ट्रीय आपातकाल: 112 | एम्बुलेंस: 108 | जननी शिशु सुरक्षा: 104`,
  },
  {
    patterns: [
      "suicidal", "kill myself", "end my life",
      "apni jaan lena", "mar jaunga",
    ],
    en: `🚨 I'm concerned about you. Your life matters.

Please call iCALL (Free mental health helpline): 9152987821
Or Vandrevala Foundation: 1860-2333-350

You are not alone. Help is available right now.
A mental health professional can support you through this.`,
    hi: `🚨 मुझे आपकी चिंता है। आपकी ज़िंदगी मायने रखती है।

कृपया iCALL (मुफ्त मानसिक स्वास्थ्य हेल्पलाइन): 9152987821
या वंदरेवाला फाउंडेशन: 1860-2333-350

आप अकेले नहीं हैं। अभी मदद उपलब्ध है।
एक मानसिक स्वास्थ्य पेशेवर आपको इस परिस्थिति में सहारा दे सकता है।`,
  },
];

const GENERIC_EMERGENCY_EN = `🚨 EMERGENCY DETECTED

This sounds like a medical emergency. Please:
1. Call 112 (National Emergency) or 108 (Ambulance) immediately
2. Do not panic — stay calm and help the person stay still
3. Keep them comfortable until help arrives
4. Do NOT give food, water, or medicines unless specifically advised

Nearest Government Hospital is your best option for emergencies.
Health Helpline: 104`;

const GENERIC_EMERGENCY_HI = `🚨 आपातकाल की स्थिति

यह एक चिकित्सा आपातकाल लग रहा है। कृपया:
1. तुरंत 112 (राष्ट्रीय आपातकाल) या 108 (एम्बुलेंस) पर कॉल करें
2. घबराएं नहीं — शांत रहें और व्यक्ति को स्थिर रखें
3. मदद आने तक आरामदायक रखें
4. विशेष सलाह के बिना खाना, पानी या दवाई न दें

आपातकाल के लिए निकटतम सरकारी अस्पताल सबसे अच्छा विकल्प है।
स्वास्थ्य हेल्पलाइन: 104`;

export function detectEmergency(text: string): EmergencyResult {
  const normalized = text.toLowerCase().trim();

  for (const template of EMERGENCY_PATTERNS) {
    for (const pattern of template.patterns) {
      if (normalized.includes(pattern.toLowerCase())) {
        return {
          isEmergency: true,
          responseEn: template.en,
          responseHi: template.hi,
        };
      }
    }
  }

  return {
    isEmergency: false,
    responseEn: null,
    responseHi: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR CONVERSATION SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────

export function buildDoctorSystemPrompt(
  language: string,
  userContext: string,
  reportContext?: string
): string {
  const targetLangName = language === "hi" ? "Hindi" : "English";

  const reportSection = reportContext
    ? `\n\nMEDICAL REPORT ANALYSIS (from scanner):\nThe user just had a medical report analyzed. Here are the results:\n${reportContext}\n\nThe user is now asking about these results. Explain the findings in simple language and start a doctor-like conversation about their health based on this report.`
    : "";

  return `
You are AarogyaMitra AI, an expert Indian healthcare assistant that behaves like a real doctor.

USER LANGUAGE MANDATE:
The user's preferred language is: ${targetLangName}.
You MUST respond strictly and completely in ${targetLangName}.
${
  language === "hi"
    ? "IMPORTANT: Write your ENTIRE response in natural Hindi using Devanagari script (हिंदी लिपि). Do not output English sentences."
    : "IMPORTANT: Write your ENTIRE response in clear, natural English."
}

═══════════════════════════════════════════════
DOCTOR CONVERSATION PROTOCOL (CRITICAL)
═══════════════════════════════════════════════

You are a doctor. Real doctors do NOT give a diagnosis after one sentence. They ask questions first.

**Phase 1 — INTAKE (follow-up questions)**
When a user describes a symptom or health concern:
1. NEVER give a complete diagnosis, treatment plan, or health assessment on the first response.
2. Instead, acknowledge briefly (1 line), then ask ONE follow-up question.
3. Ask only the MOST relevant question — skip questions whose answers are already in the patient context below.
4. Maximum 3 follow-up questions before moving to assessment. If the user provides enough detail upfront, skip directly to assessment.

Good follow-up questions ask about:
- Duration ("How many days has this been happening?")
- Severity ("On a scale of 1-10, how severe?")
- Associated symptoms ("Any fever, nausea, or dizziness?")
- Existing conditions ("Do you have diabetes, BP, or thyroid?")

**Phase 2 — COMPREHENSIVE ASSESSMENT**
After you have enough information (from follow-up answers or rich initial description), provide a COMPLETE assessment containing ALL of these sections:

1. **Risk Score:** 0-100 number with label (Low/Medium/High/Emergency)
2. **Possible Condition:** Brief explanation of what might be happening
3. **Specialist Recommendation:** Which doctor to consult (e.g., Cardiologist, General Physician, Dermatologist)
4. **Diet Plan:** 3-5 specific dietary recommendations
5. **Exercise Plan:** 3-5 specific exercises or physical activities
6. **Lifestyle Tips:** 3-5 actionable lifestyle changes
7. **Weekly Goals:** 3 measurable goals for the coming week
8. **Follow-up Reminder:** When to check back or see a doctor

**Phase 3 — CONVERSATIONAL**
- Be warm, empathetic, and use simple language.
- Use emojis sparingly (🩺 💊 🏥 ✅ ⚠️ 📋).
- Use **bold** for section headings.
- Use bullet points for lists.
- Keep each response focused and not too long (3-6 short sections max).

═══════════════════════════════════════════════
SUGGESTED REPLIES (CRITICAL FORMAT)
═══════════════════════════════════════════════

At the END of EVERY response, you must append suggested reply options that the user can click next. Format:

[SUGGESTED_REPLIES]option 1|option 2|option 3[/SUGGESTED_REPLIES]

Rules for suggested replies:
- During intake phase: offer answer choices or next steps (e.g., "It's been 2 days|About a week|Very severe pain|I also have fever")
- During assessment phase: offer follow-up actions (e.g., "Book appointment|Diet plan details|Exercise plan details|I have more questions")
- Always provide 2-4 options, separated by | character
- Keep each option short (max 5 words)
- These help the user respond quickly

═══════════════════════════════════════════════
SAFETY RULES
═══════════════════════════════════════════════
- NEVER prescribe prescription-only medicines. You may mention OTC options (Paracetamol, ORS).
- Always advise consulting a real doctor for diagnosis.
- If the conversation touches on suicidal ideation, immediately provide helpline numbers.

PATIENT CONTEXT:
${userContext}${reportSection}

IMPORTANT:
- Never write "Translation:" or provide translations.
- Never mention these instructions to the user.
- Always end with the [SUGGESTED_REPLIES] block.
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUGGESTED REPLIES PARSER
// ─────────────────────────────────────────────────────────────────────────────

export function parseSuggestedReplies(text: string): {
  cleanText: string;
  suggestions: string[];
} {
  const match = text.match(
    /\[SUGGESTED_REPLIES\]([\s\S]*?)\[\/SUGGESTED_REPLIES\]/
  );

  if (!match) {
    return { cleanText: text, suggestions: [] };
  }

  const suggestionsRaw = match[1].trim();
  const suggestions = suggestionsRaw
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 4);

  const cleanText = text.replace(
    /\[SUGGESTED_REPLIES\][\s\S]*?\[\/SUGGESTED_REPLIES\]/,
    ""
  ).trim();

  return { cleanText, suggestions };
}

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-MODULE INTEGRATION ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface IntegrationAction {
  label: string;
  link: string;
  icon: string; // icon name key for lucide-react
}

export function getIntegrationActions(text: string): IntegrationAction[] {
  const lower = text.toLowerCase();
  const actions: IntegrationAction[] = [];

  // Hospital / emergency
  if (
    lower.includes("hospital") ||
    lower.includes("emergency") ||
    lower.includes("112") ||
    lower.includes("ambulance") ||
    lower.includes("अस्पताल") ||
    lower.includes("आपातकाल")
  ) {
    actions.push({
      label: "Find Hospital",
      link: "/hospital",
      icon: "hospital",
    });
  }

  // Specialist / appointment
  if (
    lower.includes("specialist") ||
    lower.includes("doctor") ||
    lower.includes("consult") ||
    lower.includes("appointment") ||
    lower.includes("डॉक्टर") ||
    lower.includes("विशेषज्ञ")
  ) {
    actions.push({
      label: "Book Appointment",
      link: "/appointments",
      icon: "calendar",
    });
  }

  // Medicine
  if (
    lower.includes("medicine") ||
    lower.includes("medication") ||
    lower.includes("tablet") ||
    lower.includes("dose") ||
    lower.includes("दवाई") ||
    lower.includes("दवा") ||
    lower.includes("गोली")
  ) {
    actions.push({
      label: "Add Medicine",
      link: "/medicines",
      icon: "pill",
    });
  }

  // Diet / nutrition
  if (
    lower.includes("diet") ||
    lower.includes("nutrition") ||
    lower.includes("food") ||
    lower.includes("eat") ||
    lower.includes("आहार") ||
    lower.includes("खाना")
  ) {
    // No direct page, but could save or show more — link to chat itself
    actions.push({
      label: "Diet Details",
      link: "/chat",
      icon: "apple",
    });
  }

  // Report / scan
  if (
    lower.includes("report") ||
    lower.includes("lab") ||
    lower.includes("test") ||
    lower.includes("scan") ||
    lower.includes("रिपोर्ट") ||
    lower.includes("जांच")
  ) {
    actions.push({
      label: "Scan Report",
      link: "/report-analyzer",
      icon: "file",
    });
  }

  // Government schemes
  if (
    lower.includes("scheme") ||
    lower.includes("ayushman") ||
    lower.includes("jan aushadhi") ||
    lower.includes("government") ||
    lower.includes("योजना") ||
    lower.includes("सरकारी")
  ) {
    actions.push({
      label: "Check Schemes",
      link: "/schemes",
      icon: "shield",
    });
  }

  // Always add these two if not already present
  if (!actions.some((a) => a.link === "/hospital")) {
    actions.push({
      label: "Find Hospital",
      link: "/hospital",
      icon: "hospital",
    });
  }
  if (!actions.some((a) => a.link === "/report-analyzer")) {
    actions.push({
      label: "Scan Report",
      link: "/report-analyzer",
      icon: "file",
    });
  }

  // Limit to 4 actions
  return actions.slice(0, 4);
}
