/**
 * AarogyaMitra AI — Emergency Detector
 * Fast-path pre-check that runs BEFORE full NLP analysis.
 * Immediately identifies life-threatening situations.
 */

import { EMERGENCY_KEYWORDS } from "./medicalKnowledge";

export interface EmergencyResult {
  isEmergency: boolean;
  matchedKeyword: string | null;
  /** Response in English */
  responseEn: string | null;
  /** Response in Hindi */
  responseHi: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMERGENCY RESPONSE TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

const EMERGENCY_RESPONSES: Array<{
  patterns: string[];
  en: string;
  hi: string;
}> = [
  {
    patterns: [
      "chest pain", "seene me dard", "heart attack", "dil ka daura",
      "angina", "left chest", "baya seena dard", "dil me dard"
    ],
    en: `🚨 EMERGENCY ALERT — Possible Heart Emergency

Please call 112 or 108 immediately!

While waiting for help:
✅ Sit the person down — do NOT let them walk
✅ Loosen tight clothing around chest and neck
✅ If conscious and not allergic, give 1 Aspirin (325mg) to chew
✅ Stay calm and stay with the person
❌ Do NOT give food or water
❌ Do NOT leave them alone

💊 National Emergency: 112 | Ambulance: 108`,
    hi: `🚨 आपातकाल अलर्ट — संभावित हृदय आपातकाल

तुरंत 112 या 108 पर कॉल करें!

मदद आने तक:
✅ व्यक्ति को बैठाएं — चलने न दें
✅ छाती और गर्दन के तंग कपड़े ढीले करें
✅ अगर होश में हो और एलर्जी न हो तो 1 Aspirin (325mg) चबाने दें
✅ शांत रहें और साथ रहें
❌ खाना या पानी न दें
❌ अकेला न छोड़ें

💊 राष्ट्रीय आपातकाल: 112 | एम्बुलेंस: 108`
  },
  {
    patterns: [
      "can't breathe", "saas nahi aa rahi", "breathless", "suffocating",
      "ghut raha", "breathing stopped", "saas band"
    ],
    en: `🚨 EMERGENCY — Breathing Difficulty

Call 112 / 108 immediately!

While waiting:
✅ Keep person upright or sitting — DO NOT lay them flat
✅ Loosen any tight clothing around neck and chest
✅ Move to fresh air if possible
✅ If they have an inhaler — use it now (2–4 puffs)
❌ Do NOT give food or water

💊 National Emergency: 112 | Ambulance: 108`,
    hi: `🚨 आपातकाल — सांस लेने में कठिनाई

तुरंत 112 / 108 पर कॉल करें!

मदद आने तक:
✅ व्यक्ति को सीधे बैठाएं — लेटाएं नहीं
✅ गर्दन और छाती के तंग कपड़े ढीले करें
✅ हो सके तो ताज़ी हवा में ले जाएं
✅ अगर इनहेलर है — अभी उपयोग करें (2–4 पफ)
❌ खाना या पानी न दें

💊 राष्ट्रीय आपातकाल: 112 | एम्बुलेंस: 108`
  },
  {
    patterns: [
      "snake bite", "sanp ne kaata", "saanp ne kaata", "snake poison",
      "saap ka zeher", "sanp ka daank"
    ],
    en: `🚨 EMERGENCY — Snake Bite

Call 112 / 108 immediately!

Critical first-aid steps:
✅ Keep the person STILL and CALM — movement spreads venom faster
✅ Keep the bitten limb BELOW heart level
✅ Remove rings, watches, tight clothing near the bite
✅ Mark swelling edge with pen + note the time
❌ DO NOT cut or suck the bite wound
❌ DO NOT apply tourniquet or ice
❌ DO NOT give any food, water, or alcohol
❌ DO NOT waste time on any home remedy

🏥 Rush to nearest Government Hospital — anti-venom is ONLY available there!
💊 National Emergency: 112 | Ambulance: 108`,
    hi: `🚨 आपातकाल — सांप का काटना

तुरंत 112 / 108 पर कॉल करें!

ज़रूरी प्राथमिक उपचार:
✅ व्यक्ति को स्थिर और शांत रखें — हिलने से ज़हर तेज़ी से फैलता है
✅ काटे गए अंग को दिल के स्तर से नीचे रखें
✅ काट के पास की अंगूठी, घड़ी, तंग कपड़े हटाएं
✅ सूजन की सीमा पेन से चिह्नित करें और समय नोट करें
❌ काटे को काटें या चूसें नहीं
❌ टूर्निकेट या बर्फ न लगाएं
❌ कोई खाना, पानी या शराब न दें
❌ किसी घरेलू उपाय पर समय बर्बाद न करें

🏥 तुरंत निकटतम सरकारी अस्पताल जाएं — एंटी-वेनम केवल वहीं मिलता है!
💊 राष्ट्रीय आपातकाल: 112 | एम्बुलेंस: 108`
  },
  {
    patterns: [
      "unconscious", "behosh", "faint", "murcha", "not responding",
      "jawab nahi", "coma"
    ],
    en: `🚨 EMERGENCY — Person Unconscious / Not Responding

Call 112 / 108 immediately!

While waiting:
✅ Check if person is breathing — watch chest rise
✅ Place in recovery position (on side) if breathing
✅ If NOT breathing — start CPR if you know how
✅ Loosen tight clothing
✅ Keep airway clear — tilt head back gently
❌ Do NOT give anything by mouth

💊 National Emergency: 112 | Ambulance: 108`,
    hi: `🚨 आपातकाल — व्यक्ति बेहोश / कोई प्रतिक्रिया नहीं

तुरंत 112 / 108 पर कॉल करें!

मदद आने तक:
✅ जांचें कि व्यक्ति सांस ले रहा है — छाती का उठना देखें
✅ अगर सांस आ रही है तो करवट से लेटाएं
✅ अगर सांस नहीं आ रही — CPR जानते हों तो शुरू करें
✅ तंग कपड़े ढीले करें
✅ श्वास मार्ग साफ रखें — सिर धीरे से पीछे झुकाएं
❌ मुंह से कुछ न दें

💊 राष्ट्रीय आपातकाल: 112 | एम्बुलेंस: 108`
  },
  {
    patterns: [
      "heavy bleeding", "bahut khoon", "blood not stopping", "khoon nahi ruk raha",
      "arterial bleeding", "spurting blood"
    ],
    en: `🚨 EMERGENCY — Severe Bleeding

Call 112 / 108 immediately!

While waiting:
✅ Apply FIRM, DIRECT pressure with a clean cloth — do NOT remove it
✅ If bleeding is on a limb — elevate above heart level
✅ Keep applying pressure — add more cloth on top if soaked through
❌ Do NOT remove embedded objects from wounds
❌ Do NOT apply a tourniquet unless trained to do so

💊 National Emergency: 112 | Ambulance: 108`,
    hi: `🚨 आपातकाल — अत्यधिक रक्तस्राव

तुरंत 112 / 108 पर कॉल करें!

मदद आने तक:
✅ साफ कपड़े से मज़बूत, सीधा दबाव डालें — कपड़ा न हटाएं
✅ अगर अंग पर है तो दिल से ऊपर उठाएं
✅ दबाव बनाए रखें — खून निकले तो ऊपर और कपड़ा रखें
❌ घाव से फंसी चीज़ें न निकालें
❌ प्रशिक्षण न हो तो टूर्निकेट न बांधें

💊 राष्ट्रीय आपातकाल: 112 | एम्बुलेंस: 108`
  },
  {
    patterns: [
      "stroke", "paralysis", "laqwa", "face drooping", "chehra tircha",
      "sudden arm weakness", "baah me achanak kamzori", "speech difficulty"
    ],
    en: `🚨 EMERGENCY — Possible Stroke (Brain Attack)

Use the FAST test:
🔴 Face — Is one side drooping?
🔴 Arms — Can they raise both arms equally?
🔴 Speech — Is speech slurred or confused?
🔴 Time — Call 112 / 108 NOW!

While waiting:
✅ Keep person lying down with head slightly elevated
✅ Note the exact time symptoms started
✅ Stay calm and reassure them
❌ Do NOT give food, water, or medicines
❌ Do NOT leave them alone

💊 National Emergency: 112 | Ambulance: 108`,
    hi: `🚨 आपातकाल — संभावित स्ट्रोक (दिमागी दौरा)

FAST टेस्ट करें:
🔴 Face (चेहरा) — क्या एक तरफ झुक रहा है?
🔴 Arms (बांहें) — क्या दोनों बांहें समान रूप से उठा सकते हैं?
🔴 Speech (बोलना) — क्या बोलना लड़खड़ा रहा है?
🔴 Time (समय) — अभी 112 / 108 पर कॉल करें!

मदद आने तक:
✅ व्यक्ति को सिर थोड़ा ऊंचा करके लेटाएं
✅ लक्षण शुरू होने का सटीक समय नोट करें
✅ शांत रहें
❌ खाना, पानी या दवाई न दें
❌ अकेला न छोड़ें

💊 राष्ट्रीय आपातकाल: 112 | एम्बुलेंस: 108`
  },
  {
    patterns: [
      "labour pain", "prasav peeda", "water broke", "paani toot gaya",
      "bleeding pregnancy", "pregnancy me khoon"
    ],
    en: `🚨 EMERGENCY — Pregnancy Emergency

Call 112 / 108 immediately!

While waiting:
✅ Help the mother lie on her left side — this improves blood flow to baby
✅ Keep her calm and breathing slowly
✅ Do NOT try to deliver the baby yourself unless birth is imminent
✅ If water has broken, note the time
❌ Do NOT give food or water if going to hospital

🏥 Go to nearest hospital with maternity ward immediately!
💊 National Emergency: 112 | Ambulance: 108 | Janani Shishu Suraksha: 104`,
    hi: `🚨 आपातकाल — गर्भावस्था आपातकाल

तुरंत 112 / 108 पर कॉल करें!

मदद आने तक:
✅ माँ को बाईं तरफ करवट से लेटाएं — इससे बच्चे को रक्त प्रवाह बेहतर होता है
✅ शांत रखें और धीरे सांस लेने में मदद करें
✅ खुद डिलीवरी कराने की कोशिश न करें जब तक बिल्कुल ज़रूरी न हो
✅ अगर पानी टूटा हो तो समय नोट करें
❌ अस्पताल जाना हो तो खाना या पानी न दें

🏥 तुरंत निकटतम प्रसूति वार्ड वाले अस्पताल जाएं!
💊 राष्ट्रीय आपातकाल: 112 | एम्बुलेंस: 108 | जननी शिशु सुरक्षा: 104`
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT EMERGENCY RESPONSE (when keyword matched but no specific template)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_EMERGENCY_EN = `🚨 EMERGENCY DETECTED

This sounds like a medical emergency. Please:

1️⃣ Call 112 (National Emergency) or 108 (Ambulance) immediately
2️⃣ Do not panic — stay calm and help the person stay still
3️⃣ Keep them comfortable until help arrives
4️⃣ Do NOT give food, water, or medicines unless specifically advised

🏥 Nearest Government Hospital is your best option for emergencies.
💊 Health Helpline: 104`;

const DEFAULT_EMERGENCY_HI = `🚨 आपातकाल की स्थिति

यह एक चिकित्सा आपातकाल लग रहा है। कृपया:

1️⃣ तुरंत 112 (राष्ट्रीय आपातकाल) या 108 (एम्बुलेंस) पर कॉल करें
2️⃣ घबराएं नहीं — शांत रहें और व्यक्ति को स्थिर रखें
3️⃣ मदद आने तक आरामदायक रखें
4️⃣ विशेष सलाह के बिना खाना, पानी या दवाई न दें

🏥 आपातकाल के लिए निकटतम सरकारी अस्पताल सबसे अच्छा विकल्प है।
💊 स्वास्थ्य हेल्पलाइन: 104`;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DETECTOR
// ─────────────────────────────────────────────────────────────────────────────

export function detectEmergency(text: string): EmergencyResult {
  const normalized = text.toLowerCase().trim();

  // Check specific response templates first
  for (const template of EMERGENCY_RESPONSES) {
    for (const pattern of template.patterns) {
      if (normalized.includes(pattern.toLowerCase())) {
        return {
          isEmergency: true,
          matchedKeyword: pattern,
          responseEn: template.en,
          responseHi: template.hi
        };
      }
    }
  }

  // Check generic emergency keywords
  for (const keyword of EMERGENCY_KEYWORDS) {
    if (normalized.includes(keyword.toLowerCase())) {
      return {
        isEmergency: true,
        matchedKeyword: keyword,
        responseEn: DEFAULT_EMERGENCY_EN,
        responseHi: DEFAULT_EMERGENCY_HI
      };
    }
  }

  return {
    isEmergency: false,
    matchedKeyword: null,
    responseEn: null,
    responseHi: null
  };
}
