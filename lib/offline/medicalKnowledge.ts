/**
 * AarogyaMitra AI — Offline Medical Knowledge Base
 * Covers 15+ conditions with multilingual support (English, Hindi, Hinglish)
 * Designed to be scalable: plug in a local AI model without structural changes.
 */

export type RiskLevel = "Low" | "Medium" | "High" | "Emergency";

export interface FollowUpQuestion {
  id: string;
  text: { en: string; hi: string };
  /** Keywords in the answer that escalate risk */
  escalationKeywords?: string[];
  /** Which risk level this question can push to if escalation triggers */
  escalateTo?: RiskLevel;
}

export interface FirstAidStep {
  en: string;
  hi: string;
}

export interface MedicalCondition {
  name: string;
  displayName: { en: string; hi: string };
  /** All keywords to detect this condition (EN + HI + Hinglish) */
  keywords: string[];
  /** Is this an immediate emergency? */
  emergency: boolean;
  /** Default risk before follow-up refinement */
  defaultRisk: RiskLevel;
  /** Ordered follow-up questions */
  questions: FollowUpQuestion[];
  /** First-aid steps */
  firstAid: FirstAidStep[];
  /** When to see a doctor */
  doctorAdvice: { en: string; hi: string };
  /** Dos and Don'ts */
  dos: { en: string; hi: string }[];
  donts: { en: string; hi: string }[];
  /** Risk factors that escalate severity */
  riskFactors: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE BASE
// ─────────────────────────────────────────────────────────────────────────────

export const medicalKnowledgeBase: Record<string, MedicalCondition> = {

  // ── FEVER ──────────────────────────────────────────────────────────────────
  fever: {
    name: "fever",
    displayName: { en: "Fever", hi: "बुखार" },
    keywords: [
      "fever", "bukhar", "bukhaar", "temperature", "temp high", "garam",
      "body hot", "tez bukhar", "hafta se bukhar", "din se bukhar",
      "jwar", "jwara", "badan garam", "thoda bukhar", "halka bukhar",
      "high fever", "mild fever", "low grade fever"
    ],
    emergency: false,
    defaultRisk: "Low",
    questions: [
      {
        id: "fever_temp",
        text: {
          en: "What is your temperature? (e.g. 101°F, 38°C)",
          hi: "आपका तापमान कितना है? (जैसे 101°F, 38°C)"
        },
        escalationKeywords: ["104", "105", "106", "40", "41", "42", "bahut zyada", "very high"],
        escalateTo: "High"
      },
      {
        id: "fever_duration",
        text: {
          en: "How many days have you had the fever?",
          hi: "कितने दिनों से बुखार है?"
        },
        escalationKeywords: ["3 day", "4 day", "5 day", "week", "hafte", "3 din", "4 din", "5 din", "long time"],
        escalateTo: "High"
      },
      {
        id: "fever_symptoms",
        text: {
          en: "Do you have body ache, chills, or rashes along with fever?",
          hi: "क्या बुखार के साथ बदन दर्द, कंपकंपी या चकत्ते भी हैं?"
        },
        escalationKeywords: ["rash", "chakatte", "convulsion", "fits", "unconscious"],
        escalateTo: "Emergency"
      },
      {
        id: "fever_medicine",
        text: {
          en: "Have you taken any medicine for the fever?",
          hi: "क्या आपने बुखार के लिए कोई दवाई ली है?"
        }
      }
    ],
    firstAid: [
      { en: "Take Paracetamol (Crocin/Dolo 650) if temperature > 100°F", hi: "अगर तापमान 100°F से ज़्यादा हो तो पेरासिटामोल (Crocin/Dolo 650) लें" },
      { en: "Rest and drink plenty of fluids (water, ORS, coconut water)", hi: "आराम करें और पानी, ORS, नारियल पानी पियें" },
      { en: "Apply a cool, damp cloth on forehead to reduce temperature", hi: "माथे पर ठंडा गीला कपड़ा लगाएं" },
      { en: "Wear light, breathable clothing — avoid heavy blankets", hi: "हल्के कपड़े पहनें — भारी रज़ाई न ओढ़ें" },
      { en: "Monitor temperature every 4–6 hours", hi: "हर 4–6 घंटे में तापमान जांचें" }
    ],
    doctorAdvice: {
      en: "See a doctor if fever is above 103°F, lasts more than 3 days, or is accompanied by rash, severe headache, or convulsions.",
      hi: "अगर बुखार 103°F से ज़्यादा हो, 3 दिन से ज़्यादा रहे, या रैश, तेज सिरदर्द या झटके आएं तो तुरंत डॉक्टर के पास जाएं।"
    },
    dos: [
      { en: "Rest well", hi: "अच्छा आराम करें" },
      { en: "Stay hydrated", hi: "पानी पीते रहें" },
      { en: "Eat light meals like khichdi, dal", hi: "हल्का खाना खाएं जैसे खिचड़ी, दाल" }
    ],
    donts: [
      { en: "Don't take Aspirin (especially in children)", hi: "एस्पिरिन न लें (बच्चों में विशेष रूप से)" },
      { en: "Don't wrap in heavy blankets", hi: "भारी रज़ाई न ओढ़ें" }
    ],
    riskFactors: ["high temperature", "long duration", "rash", "convulsion", "infant fever"]
  },

  // ── COLD ───────────────────────────────────────────────────────────────────
  cold: {
    name: "cold",
    displayName: { en: "Cold / Runny Nose", hi: "सर्दी / नाक बहना" },
    keywords: [
      "cold", "sardi", "naak bahna", "runny nose", "stuffy nose",
      "naak band", "sneezing", "chhink", "common cold", "zukam", "jukam",
      "naak me jam gaya", "nose blocked"
    ],
    emergency: false,
    defaultRisk: "Low",
    questions: [
      {
        id: "cold_duration",
        text: {
          en: "How long have you had the cold?",
          hi: "कितने दिनों से सर्दी है?"
        },
        escalationKeywords: ["week", "10 day", "hafte", "10 din"],
        escalateTo: "Medium"
      },
      {
        id: "cold_fever",
        text: {
          en: "Do you also have fever along with the cold?",
          hi: "क्या सर्दी के साथ बुखार भी है?"
        },
        escalationKeywords: ["yes", "haan", "ha", "bukhar hai", "temperature"],
        escalateTo: "Medium"
      },
      {
        id: "cold_throat",
        text: {
          en: "Is there throat pain or difficulty swallowing?",
          hi: "क्या गले में दर्द या निगलने में तकलीफ है?"
        }
      }
    ],
    firstAid: [
      { en: "Steam inhalation 2–3 times a day to clear nasal congestion", hi: "दिन में 2–3 बार भाप लें, नाक की रुकावट दूर होगी" },
      { en: "Drink warm water, ginger tea (adrak chai), turmeric milk", hi: "गर्म पानी, अदरक की चाय, हल्दी वाला दूध पियें" },
      { en: "Saline nasal drops help clear blocked nose", hi: "नमक के पानी की नाक में बूंदें डालें" },
      { en: "Rest in a warm, dry room", hi: "गर्म और सूखे कमरे में आराम करें" },
      { en: "Take antihistamine (Cetirizine) if prescribed by doctor", hi: "डॉक्टर द्वारा बताई गई एंटीहिस्टामाइन (Cetirizine) लें" }
    ],
    doctorAdvice: {
      en: "See a doctor if cold lasts more than 10 days, or is accompanied by high fever, ear pain, or yellow/green mucus.",
      hi: "अगर सर्दी 10 दिन से ज़्यादा रहे, या तेज़ बुखार, कान में दर्द, या पीले/हरे रंग का बलगम हो तो डॉक्टर से मिलें।"
    },
    dos: [
      { en: "Stay warm and rest", hi: "गर्म रहें और आराम करें" },
      { en: "Drink warm liquids frequently", hi: "बार-बार गर्म तरल पदार्थ पियें" }
    ],
    donts: [
      { en: "Avoid cold water and ice cream", hi: "ठंडा पानी और आइसक्रीम से बचें" },
      { en: "Don't share utensils to prevent spreading", hi: "फैलाव रोकने के लिए बर्तन साझा न करें" }
    ],
    riskFactors: ["high fever with cold", "prolonged cold", "ear pain", "sinus pressure"]
  },

  // ── COUGH ──────────────────────────────────────────────────────────────────
  cough: {
    name: "cough",
    displayName: { en: "Cough", hi: "खांसी" },
    keywords: [
      "cough", "khansi", "khaansi", "khasi", "dry cough", "sukhi khansi",
      "wet cough", "balgam", "phlegm", "mucus khansi", "khansi aa rahi",
      "khansi ho rahi", "chest congestion", "khansi nahi ja rahi"
    ],
    emergency: false,
    defaultRisk: "Low",
    questions: [
      {
        id: "cough_type",
        text: {
          en: "Is your cough dry, or do you cough up phlegm/mucus?",
          hi: "खांसी सूखी है या बलगम वाली है?"
        },
        escalationKeywords: ["blood", "khoon", "laal", "red mucus"],
        escalateTo: "Emergency"
      },
      {
        id: "cough_duration",
        text: {
          en: "How many days have you had this cough?",
          hi: "कितने दिनों से खांसी है?"
        },
        escalationKeywords: ["week", "hafte", "month", "mahina", "2 week", "3 week"],
        escalateTo: "High"
      },
      {
        id: "cough_breathing",
        text: {
          en: "Are you having any difficulty breathing along with the cough?",
          hi: "क्या खांसी के साथ सांस लेने में भी तकलीफ है?"
        },
        escalationKeywords: ["yes", "haan", "ha", "dikkat", "hard to breathe", "saas nahi"],
        escalateTo: "High"
      }
    ],
    firstAid: [
      { en: "Honey + warm water or honey + ginger juice is very effective for cough", hi: "शहद + गर्म पानी या शहद + अदरक का रस खांसी में बहुत असरदार है" },
      { en: "Steam inhalation with Vicks/Eucalyptus oil to clear airways", hi: "Vicks / नीलगिरी तेल के साथ भाप लें" },
      { en: "Stay upright — lying flat can worsen cough", hi: "सीधे बैठे रहें — लेटने से खांसी बढ़ सकती है" },
      { en: "Avoid cold drinks, dust, and smoke", hi: "ठंडे पेय, धूल और धुएं से बचें" },
      { en: "Cough syrup (Benadryl/Honitus) can help — consult doctor first", hi: "खांसी की दवाई (Benadryl/Honitus) से मदद मिल सकती है — पहले डॉक्टर से पूछें" }
    ],
    doctorAdvice: {
      en: "See a doctor if cough lasts more than 2 weeks, produces blood-tinged sputum, or is accompanied by high fever and chest pain.",
      hi: "अगर खांसी 2 हफ्ते से ज़्यादा रहे, बलगम में खून आए, या तेज़ बुखार और सीने में दर्द हो तो डॉक्टर से मिलें।"
    },
    dos: [
      { en: "Drink warm liquids", hi: "गर्म तरल पियें" },
      { en: "Use honey as a natural remedy", hi: "प्राकृतिक उपाय के रूप में शहद का उपयोग करें" }
    ],
    donts: [
      { en: "Don't smoke or be near smokers", hi: "धूम्रपान न करें और धुएं से दूर रहें" },
      { en: "Don't eat cold/oily food", hi: "ठंडा/तला हुआ खाना न खाएं" }
    ],
    riskFactors: ["blood in sputum", "prolonged cough", "breathing difficulty", "weight loss with cough"]
  },

  // ── HEADACHE ───────────────────────────────────────────────────────────────
  headache: {
    name: "headache",
    displayName: { en: "Headache", hi: "सिरदर्द" },
    keywords: [
      "headache", "sir dard", "sar dard", "head pain", "mathe me dard",
      "sir me dard", "migraine", "migrane", "throbbing head", "tension headache",
      "sir bhari hai", "sir ghoom raha", "head heavy", "sir chakkar"
    ],
    emergency: false,
    defaultRisk: "Low",
    questions: [
      {
        id: "headache_severity",
        text: {
          en: "On a scale of 1–10, how severe is your headache?",
          hi: "1 से 10 के पैमाने पर, आपका सिरदर्द कितना तेज़ है?"
        },
        escalationKeywords: ["8", "9", "10", "bahut zyada", "severe", "unbearable", "worst"],
        escalateTo: "High"
      },
      {
        id: "headache_location",
        text: {
          en: "Where exactly is the pain — front, back, one side, or whole head?",
          hi: "दर्द कहाँ है — आगे, पीछे, एक तरफ, या पूरे सिर में?"
        }
      },
      {
        id: "headache_sudden",
        text: {
          en: "Did the headache start suddenly and very intensely (like a thunderclap)?",
          hi: "क्या सिरदर्द अचानक और बहुत तेज़ी से शुरू हुआ (जैसे बिजली गिरी हो)?"
        },
        escalationKeywords: ["yes", "haan", "sudden", "achanak", "thunderclap", "worst ever"],
        escalateTo: "Emergency"
      },
      {
        id: "headache_nausea",
        text: {
          en: "Do you feel nausea, vomiting, or sensitivity to light with the headache?",
          hi: "क्या सिरदर्द के साथ उल्टी जैसा लग रहा है, तेज़ रोशनी से तकलीफ है?"
        }
      }
    ],
    firstAid: [
      { en: "Rest in a quiet, dark room", hi: "शांत, अंधेरे कमरे में आराम करें" },
      { en: "Apply a cold or warm compress on the forehead", hi: "माथे पर ठंडा या गर्म सेंक लगाएं" },
      { en: "Take Paracetamol or Ibuprofen (as per doctor's advice)", hi: "पेरासिटामोल या इबुप्रोफेन लें (डॉक्टर की सलाह अनुसार)" },
      { en: "Drink a glass of water — dehydration is a common cause", hi: "पानी पियें — पानी की कमी एक सामान्य कारण है" },
      { en: "Gentle head massage can help relieve tension headache", hi: "हल्की सिर की मालिश तनाव वाले सिरदर्द में राहत दे सकती है" }
    ],
    doctorAdvice: {
      en: "Seek EMERGENCY help if headache is the worst of your life, sudden onset, with fever/stiff neck, vision changes, or confusion.",
      hi: "अगर सिरदर्द जीवन का सबसे तेज़ दर्द हो, अचानक शुरू हो, बुखार/गर्दन अकड़न, दृष्टि बदलाव या भ्रम के साथ हो तो तुरंत आपातकालीन मदद लें।"
    },
    dos: [
      { en: "Stay hydrated", hi: "पानी पीते रहें" },
      { en: "Rest in a dark room", hi: "अंधेरे कमरे में आराम करें" }
    ],
    donts: [
      { en: "Don't stare at screens", hi: "स्क्रीन पर न देखें" },
      { en: "Don't ignore sudden severe headache", hi: "अचानक तेज़ सिरदर्द को नज़रअंदाज़ न करें" }
    ],
    riskFactors: ["thunderclap onset", "fever with stiff neck", "vision changes", "neurological signs"]
  },

  // ── VOMITING ───────────────────────────────────────────────────────────────
  vomiting: {
    name: "vomiting",
    displayName: { en: "Vomiting / Nausea", hi: "उल्टी / मतली" },
    keywords: [
      "vomiting", "vomit", "ulti", "ultee", "nausea", "ji machlana",
      "mitli", "ukaai", "food poisoning", "khana kharab", "ulti ho rahi",
      "pait kharab", "khana nahi sohat", "throw up", "queasy"
    ],
    emergency: false,
    defaultRisk: "Low",
    questions: [
      {
        id: "vomit_frequency",
        text: {
          en: "How many times have you vomited in the last few hours?",
          hi: "पिछले कुछ घंटों में कितनी बार उल्टी हुई?"
        },
        escalationKeywords: ["5", "6", "7", "8", "many times", "baar baar", "repeatedly", "non-stop"],
        escalateTo: "High"
      },
      {
        id: "vomit_blood",
        text: {
          en: "Is there any blood in the vomit, or is it dark/coffee-colored?",
          hi: "क्या उल्टी में खून है, या यह काली/कॉफी रंग की है?"
        },
        escalationKeywords: ["yes", "haan", "blood", "khoon", "laal", "black", "kaala", "coffee"],
        escalateTo: "Emergency"
      },
      {
        id: "vomit_dehydration",
        text: {
          en: "Are you feeling very thirsty, dizzy, or is your mouth very dry?",
          hi: "क्या आपको बहुत प्यास लग रही है, चक्कर आ रहे हैं, या मुंह सूखा लग रहा है?"
        },
        escalationKeywords: ["yes", "haan", "chakkar", "very thirsty", "very dry"],
        escalateTo: "High"
      }
    ],
    firstAid: [
      { en: "Sip ORS (Oral Rehydration Solution) slowly — available at any chemist", hi: "ORS (ओरल रिहाइड्रेशन सॉल्यूशन) धीरे-धीरे पियें — किसी भी दवाई की दुकान पर मिलता है" },
      { en: "Make ORS at home: 1 liter water + 6 teaspoons sugar + 0.5 teaspoon salt", hi: "घर पर ORS बनाएं: 1 लीटर पानी + 6 चम्मच चीनी + आधा चम्मच नमक" },
      { en: "Rest and avoid solid food until vomiting stops", hi: "उल्टी रुकने तक आराम करें और ठोस खाना न खाएं" },
      { en: "Ginger tea or ginger candy can help reduce nausea", hi: "अदरक की चाय या अदरक की गोली मतली कम करने में मदद करती है" },
      { en: "Keep head elevated while lying down", hi: "लेटते समय सिर ऊंचा रखें" }
    ],
    doctorAdvice: {
      en: "See a doctor immediately if vomiting contains blood, if you cannot keep any fluids down for 8+ hours, or if signs of dehydration appear (dry mouth, no urination).",
      hi: "अगर उल्टी में खून हो, 8 घंटे से ज़्यादा कुछ भी न रुके, या निर्जलीकरण के लक्षण हों तो तुरंत डॉक्टर के पास जाएं।"
    },
    dos: [
      { en: "Keep sipping ORS or coconut water", hi: "ORS या नारियल पानी पीते रहें" },
      { en: "Rest flat if dizzy", hi: "चक्कर आने पर लेट जाएं" }
    ],
    donts: [
      { en: "Don't eat solid food immediately after vomiting", hi: "उल्टी के तुरंत बाद ठोस खाना न खाएं" },
      { en: "Don't take painkillers on empty stomach", hi: "खाली पेट दर्द निवारक न लें" }
    ],
    riskFactors: ["blood in vomit", "dehydration signs", "prolonged vomiting", "infant vomiting"]
  },

  // ── DIARRHEA ───────────────────────────────────────────────────────────────
  diarrhea: {
    name: "diarrhea",
    displayName: { en: "Diarrhea / Loose Motions", hi: "दस्त / लूज़ मोशन" },
    keywords: [
      "diarrhea", "loose motion", "loose stool", "dast", "daast", "latrine",
      "pait kharab", "pait chalna", "stomach upset", "motions", "watery stool",
      "pani jaisa potty", "bar bar potty", "bar bar toilet"
    ],
    emergency: false,
    defaultRisk: "Low",
    questions: [
      {
        id: "diarrhea_frequency",
        text: {
          en: "How many times loose motion in the last 24 hours?",
          hi: "पिछले 24 घंटों में कितनी बार दस्त हुए?"
        },
        escalationKeywords: ["10", "15", "20", "many", "baar baar", "non-stop"],
        escalateTo: "High"
      },
      {
        id: "diarrhea_blood",
        text: {
          en: "Is there any blood or mucus in the stool?",
          hi: "क्या मल में खून या बलगम है?"
        },
        escalationKeywords: ["yes", "haan", "blood", "khoon", "laal", "mucus"],
        escalateTo: "Emergency"
      },
      {
        id: "diarrhea_dehydration",
        text: {
          en: "Are you feeling very weak, dizzy, or not passing urine?",
          hi: "क्या बहुत कमज़ोरी लग रही है, चक्कर आ रहे हैं, या पेशाब नहीं हो रहा?"
        },
        escalationKeywords: ["yes", "haan", "kamzori", "very weak", "no urine", "peshab nahi"],
        escalateTo: "High"
      }
    ],
    firstAid: [
      { en: "Start ORS immediately — give after every loose stool", hi: "तुरंत ORS शुरू करें — हर दस्त के बाद दें" },
      { en: "BRAT diet: Banana, Rice, Apple (stewed), Toast — easy to digest", hi: "BRAT डाइट: केला, चावल, उबला सेब, टोस्ट — आसानी से पचने वाला" },
      { en: "Curd (dahi) with rice helps restore gut bacteria", hi: "दही-चावल पेट के बैक्टीरिया को ठीक करता है" },
      { en: "Avoid dairy, fatty foods, and spicy food", hi: "डेयरी, तैलीय और मसालेदार खाने से बचें" },
      { en: "Wash hands frequently — diarrhea is highly contagious", hi: "बार-बार हाथ धोएं — दस्त बहुत संक्रामक है" }
    ],
    doctorAdvice: {
      en: "See a doctor immediately if stool contains blood, diarrhea lasts more than 2 days with high fever, or signs of severe dehydration appear.",
      hi: "अगर मल में खून हो, 2 दिन से ज़्यादा दस्त और तेज़ बुखार हो, या गंभीर निर्जलीकरण के लक्षण हों तो तुरंत डॉक्टर के पास जाएं।"
    },
    dos: [
      { en: "Drink ORS after every motion", hi: "हर दस्त के बाद ORS पियें" },
      { en: "Eat light, easily digestible food", hi: "हल्का, आसानी से पचने वाला खाना खाएं" }
    ],
    donts: [
      { en: "Don't stop ORS even if vomiting", hi: "उल्टी होने पर भी ORS बंद न करें" },
      { en: "Don't take antibiotics without doctor's prescription", hi: "डॉक्टर की पर्ची के बिना एंटीबायोटिक न लें" }
    ],
    riskFactors: ["blood in stool", "infant diarrhea", "severe dehydration", "cholera-like symptoms"]
  },

  // ── CHEST PAIN ─────────────────────────────────────────────────────────────
  chestPain: {
    name: "chestPain",
    displayName: { en: "Chest Pain", hi: "सीने में दर्द" },
    keywords: [
      "chest pain", "chest me dard", "seene me dard", "sina dard",
      "heart pain", "dil me dard", "left chest", "baya seena",
      "chest tight", "seena jakda", "pressure in chest", "chest heaviness",
      "chest squeez", "heart attack", "angina", "dil ka daura"
    ],
    emergency: true,
    defaultRisk: "Emergency",
    questions: [
      {
        id: "chest_breathing",
        text: {
          en: "Are you having difficulty breathing right now?",
          hi: "क्या अभी सांस लेने में तकलीफ हो रही है?"
        },
        escalationKeywords: ["yes", "haan", "ha", "very hard", "can't breathe", "saas nahi"],
        escalateTo: "Emergency"
      },
      {
        id: "chest_radiation",
        text: {
          en: "Does the pain spread to your arm, jaw, neck, or back?",
          hi: "क्या दर्द बांह, जबड़े, गर्दन या पीठ की तरफ फैल रहा है?"
        },
        escalationKeywords: ["yes", "haan", "arm", "baah", "jaw", "jabda", "neck", "gardan", "back", "peeth"],
        escalateTo: "Emergency"
      }
    ],
    firstAid: [
      { en: "🚨 CALL 112 / 108 IMMEDIATELY — This could be a heart attack", hi: "🚨 तुरंत 112 / 108 पर कॉल करें — यह दिल का दौरा हो सकता है" },
      { en: "Make the person sit down — do NOT let them walk around", hi: "व्यक्ति को बैठाएं — उन्हें चलने न दें" },
      { en: "Loosen tight clothing around chest and neck", hi: "छाती और गर्दन के आसपास के तंग कपड़े ढीले करें" },
      { en: "If person is conscious, give Aspirin 325mg to chew (only if not allergic)", hi: "अगर व्यक्ति होश में है, तो Aspirin 325mg चबाने को दें (केवल अगर एलर्जी न हो)" },
      { en: "Keep calm and stay with them until help arrives", hi: "शांत रहें और मदद आने तक उनके साथ रहें" }
    ],
    doctorAdvice: {
      en: "EMERGENCY: Call 112/108 immediately. Do not wait. Chest pain with breathing difficulty or arm/jaw pain is a medical emergency.",
      hi: "आपातकाल: तुरंत 112/108 पर कॉल करें। प्रतीक्षा न करें। सांस की तकलीफ या बांह/जबड़े में दर्द के साथ सीने में दर्द एक चिकित्सा आपातकाल है।"
    },
    dos: [
      { en: "Call emergency services immediately", hi: "तुरंत आपातकालीन सेवाओं को बुलाएं" },
      { en: "Keep the person calm and seated", hi: "व्यक्ति को शांत और बैठाए रखें" }
    ],
    donts: [
      { en: "Don't give food or water", hi: "खाना या पानी न दें" },
      { en: "Don't leave the person alone", hi: "व्यक्ति को अकेला न छोड़ें" }
    ],
    riskFactors: ["breathing difficulty", "arm/jaw radiation", "sweating", "age > 45", "previous heart disease"]
  },

  // ── ASTHMA ─────────────────────────────────────────────────────────────────
  asthma: {
    name: "asthma",
    displayName: { en: "Asthma / Breathing Difficulty", hi: "दमा / सांस की तकलीफ" },
    keywords: [
      "asthma", "dama", "damaa", "breathing problem", "breathlessness",
      "saas phoolna", "saas lene me takleef", "saas nahi aa rahi",
      "wheezing", "ghargharahat", "inhaler", "chest tightness",
      "saans ki bimari", "respiratory", "shortness of breath"
    ],
    emergency: false,
    defaultRisk: "High",
    questions: [
      {
        id: "asthma_inhaler",
        text: {
          en: "Do you have an inhaler with you? Have you used it?",
          hi: "क्या आपके पास इनहेलर है? क्या आपने इसका उपयोग किया?"
        }
      },
      {
        id: "asthma_severity",
        text: {
          en: "Can you speak full sentences, or is talking very difficult right now?",
          hi: "क्या आप पूरे वाक्य बोल सकते हैं, या अभी बोलना बहुत मुश्किल है?"
        },
        escalationKeywords: ["can't speak", "very hard", "nahi bol sakta", "bahut mushkil", "struggling"],
        escalateTo: "Emergency"
      },
      {
        id: "asthma_trigger",
        text: {
          en: "What triggered it — dust, smoke, cold air, exercise, or something else?",
          hi: "किस चीज़ से शुरू हुआ — धूल, धुआं, ठंडी हवा, व्यायाम या कुछ और?"
        }
      }
    ],
    firstAid: [
      { en: "Use rescue inhaler (Salbutamol/Albuterol) 2–4 puffs immediately", hi: "तुरंत रेस्क्यू इनहेलर (Salbutamol/Albuterol) के 2–4 पफ लें" },
      { en: "Sit upright — leaning slightly forward can help breathing", hi: "सीधे बैठें — थोड़ा आगे झुकने से सांस में मदद मिलती है" },
      { en: "Move away from trigger (dust, smoke, pet dander, cold air)", hi: "ट्रिगर से दूर जाएं (धूल, धुआं, पालतू जानवर, ठंडी हवा)" },
      { en: "Pursed lip breathing — breathe in through nose, slowly out through pursed lips", hi: "होंठ सिकोड़कर सांस लें — नाक से अंदर, और धीरे-धीरे बंद होंठों से बाहर" },
      { en: "If no improvement in 15 mins after inhaler — call 112/108", hi: "इनहेलर के 15 मिनट बाद भी कोई सुधार न हो — 112/108 पर कॉल करें" }
    ],
    doctorAdvice: {
      en: "Call 112/108 if breathing is severely labored, lips/fingertips turn blue, or inhaler gives no relief. This is a severe asthma attack.",
      hi: "अगर सांस लेना बहुत मुश्किल हो, होंठ/उंगलियों के नाखून नीले हो जाएं, या इनहेलर से राहत न हो तो 112/108 पर कॉल करें।"
    },
    dos: [
      { en: "Use prescribed preventive inhaler daily", hi: "निर्धारित प्रिवेंटिव इनहेलर रोज़ लें" },
      { en: "Know your triggers and avoid them", hi: "अपने ट्रिगर जानें और उनसे बचें" }
    ],
    donts: [
      { en: "Don't smoke or be near smokers", hi: "धूम्रपान न करें, धुएं से दूर रहें" },
      { en: "Don't over-exert during an attack", hi: "दौरे के दौरान अत्यधिक मेहनत न करें" }
    ],
    riskFactors: ["severe breathing difficulty", "blue lips", "no relief from inhaler", "no inhaler available"]
  },

  // ── DIABETES ───────────────────────────────────────────────────────────────
  diabetes: {
    name: "diabetes",
    displayName: { en: "Diabetes / Blood Sugar", hi: "मधुमेह / शुगर" },
    keywords: [
      "diabetes", "diabetic", "sugar", "blood sugar", "shakar", "madhumeh",
      "high blood sugar", "low blood sugar", "sugar high", "sugar low",
      "sugar kam ho gaya", "sugar zyada ho gaya", "insulin", "glucose",
      "hypoglycemia", "hyperglycemia", "sugar ki bimari"
    ],
    emergency: false,
    defaultRisk: "Medium",
    questions: [
      {
        id: "diabetes_type",
        text: {
          en: "Are you experiencing high blood sugar or low blood sugar right now?",
          hi: "अभी क्या अनुभव हो रहा है — शुगर ज़्यादा है या कम?"
        }
      },
      {
        id: "diabetes_symptoms",
        text: {
          en: "Are you feeling shaking, sweating, confused, or very weak? (Low sugar symptoms)",
          hi: "क्या कंपकंपी, पसीना, भ्रम, या बहुत कमज़ोरी लग रही है? (कम शुगर के लक्षण)"
        },
        escalationKeywords: ["yes", "haan", "shaking", "kaanp", "sweating", "confused", "unconscious"],
        escalateTo: "Emergency"
      }
    ],
    firstAid: [
      { en: "LOW SUGAR: Give 4–5 glucose tablets, or a glass of fruit juice, or sugary drink immediately", hi: "कम शुगर: तुरंत 4–5 ग्लूकोज की गोलियां, या एक गिलास फलों का रस, या मीठा पेय दें" },
      { en: "HIGH SUGAR: Drink plenty of water, avoid sugary foods, take prescribed medicine", hi: "ज़्यादा शुगर: पानी पियें, मीठे खाने से बचें, निर्धारित दवाई लें" },
      { en: "Check blood glucose if glucometer is available", hi: "अगर ग्लूकोमीटर है तो ब्लड ग्लूकोज़ जांचें" },
      { en: "If person is unconscious — do NOT give anything by mouth — call 112", hi: "अगर व्यक्ति बेहोश हो — मुंह से कुछ न दें — 112 पर कॉल करें" }
    ],
    doctorAdvice: {
      en: "Consult your doctor about blood sugar control. Regular HbA1c tests every 3 months are recommended.",
      hi: "ब्लड शुगर नियंत्रण के लिए अपने डॉक्टर से परामर्श लें। हर 3 महीने में HbA1c टेस्ट करवाएं।"
    },
    dos: [
      { en: "Follow diabetic diet — low GI foods", hi: "मधुमेह आहार का पालन करें — कम GI खाद्य पदार्थ" },
      { en: "Exercise regularly (30 min walk daily)", hi: "नियमित व्यायाम करें (रोज़ 30 मिनट पैदल चलें)" }
    ],
    donts: [
      { en: "Don't skip meals if on insulin", hi: "इंसुलिन पर हों तो खाना न छोड़ें" },
      { en: "Don't eat too much sugar or white rice", hi: "बहुत ज़्यादा चीनी या सफेद चावल न खाएं" }
    ],
    riskFactors: ["unconscious with low sugar", "very high sugar (>400)", "diabetic foot wound", "chest pain in diabetic"]
  },

  // ── BLOOD PRESSURE ─────────────────────────────────────────────────────────
  bloodPressure: {
    name: "bloodPressure",
    displayName: { en: "Blood Pressure", hi: "रक्तचाप / BP" },
    keywords: [
      "blood pressure", "bp", "high bp", "low bp", "hypertension",
      "bp high", "bp low", "uchha raktat chap", "neecha raktat chap",
      "bp ki bimari", "bp nahi control", "bp 180", "bp 90",
      "pressure high", "pressure low", "BP zyada", "BP kam"
    ],
    emergency: false,
    defaultRisk: "Medium",
    questions: [
      {
        id: "bp_reading",
        text: {
          en: "What is your current blood pressure reading? (e.g. 160/100)",
          hi: "आपका अभी का ब्लड प्रेशर रीडिंग क्या है? (जैसे 160/100)"
        },
        escalationKeywords: ["180", "190", "200", "220", "70/", "60/", "50/"],
        escalateTo: "High"
      },
      {
        id: "bp_symptoms",
        text: {
          en: "Are you experiencing severe headache, blurred vision, or chest pain?",
          hi: "क्या तेज़ सिरदर्द, धुंधली दृष्टि, या सीने में दर्द हो रहा है?"
        },
        escalationKeywords: ["yes", "haan", "chest pain", "seena dard", "blurred", "dhundhla", "severe"],
        escalateTo: "Emergency"
      }
    ],
    firstAid: [
      { en: "HIGH BP: Sit and rest, take prescribed BP medicine, avoid stress", hi: "ज़्यादा BP: बैठें और आराम करें, निर्धारित BP दवाई लें, तनाव से बचें" },
      { en: "LOW BP: Lie down with legs elevated, drink water/ORS/salty snack", hi: "कम BP: पैर ऊंचे करके लेटें, पानी/ORS/नमकीन स्नैक लें" },
      { en: "If BP is >180/120 with symptoms — EMERGENCY, call 112", hi: "अगर BP 180/120 से ज़्यादा हो और लक्षण हों — आपातकाल, 112 पर कॉल करें" },
      { en: "Reduce salt intake for high BP management", hi: "हाई BP नियंत्रण के लिए नमक कम खाएं" }
    ],
    doctorAdvice: {
      en: "Regular monitoring of BP is important. If BP is consistently above 140/90, consult a doctor for medication adjustment.",
      hi: "BP की नियमित जांच ज़रूरी है। अगर BP लगातार 140/90 से ऊपर रहे तो डॉक्टर से दवाई समायोजन के लिए मिलें।"
    },
    dos: [
      { en: "Take medicines regularly", hi: "दवाइयां नियमित लें" },
      { en: "Reduce salt and fatty food", hi: "नमक और तैलीय खाना कम खाएं" }
    ],
    donts: [
      { en: "Don't stop BP medicines without doctor's advice", hi: "डॉक्टर की सलाह के बिना BP की दवाई बंद न करें" },
      { en: "Don't ignore persistent high BP readings", hi: "लगातार ज़्यादा BP रीडिंग को नज़रअंदाज़ न करें" }
    ],
    riskFactors: ["BP > 180/120", "headache with high BP", "chest pain with high BP", "stroke signs"]
  },

  // ── BURNS ──────────────────────────────────────────────────────────────────
  burns: {
    name: "burns",
    displayName: { en: "Burns", hi: "जलन / जलना" },
    keywords: [
      "burn", "burns", "jalna", "jal gaya", "jal gayi", "hot water burn",
      "fire burn", "aag se jala", "garma paani se jala", "blister",
      "chhale", "skin burn", "chemical burn", "sunburn", "steam burn"
    ],
    emergency: false,
    defaultRisk: "Medium",
    questions: [
      {
        id: "burn_area",
        text: {
          en: "How large is the burned area? (Small patch, palm-sized, or larger?)",
          hi: "जला हुआ क्षेत्र कितना बड़ा है? (छोटा, हथेली के बराबर, या उससे बड़ा?)"
        },
        escalationKeywords: ["face", "chehra", "genitals", "large", "bada", "full arm", "full leg", "child"],
        escalateTo: "Emergency"
      },
      {
        id: "burn_depth",
        text: {
          en: "Is the skin blistered, white/charred, or just red?",
          hi: "क्या त्वचा पर छाले हैं, सफ़ेद/काली हो गई है, या सिर्फ लाल है?"
        },
        escalationKeywords: ["charred", "kaala", "white", "safed", "deep", "blister", "chhala"],
        escalateTo: "High"
      }
    ],
    firstAid: [
      { en: "Cool the burn with cool (NOT cold) running water for 20 minutes", hi: "जले हुए स्थान पर 20 मिनट तक ठंडे (बर्फ नहीं) बहते पानी से ठंडा करें" },
      { en: "Remove jewelry/tight clothing near the burn gently", hi: "जले हुए स्थान के पास के आभूषण/तंग कपड़े धीरे से हटाएं" },
      { en: "Cover with clean, non-fluffy dressing or cling film", hi: "साफ, रुई-रहित पट्टी या क्लिंग फिल्म से ढकें" },
      { en: "DO NOT apply toothpaste, butter, or ice — these cause more damage", hi: "टूथपेस्ट, मक्खन या बर्फ न लगाएं — ये और नुकसान करते हैं" },
      { en: "Take Paracetamol for pain", hi: "दर्द के लिए पेरासिटामोल लें" }
    ],
    doctorAdvice: {
      en: "Seek emergency help for burns on face/hands/genitals, burns larger than palm-size, deep burns (charred/white), or chemical/electrical burns.",
      hi: "चेहरे/हाथ/जननांग पर जलना, हथेली से बड़ा जला क्षेत्र, गहरे जले (काले/सफ़ेद), या रासायनिक/बिजली से जलने के लिए तुरंत आपातकालीन सहायता लें।"
    },
    dos: [
      { en: "Cool with running water for 20 min", hi: "20 मिनट तक बहते पानी से ठंडा करें" },
      { en: "Cover loosely with clean cloth", hi: "साफ कपड़े से हल्के से ढकें" }
    ],
    donts: [
      { en: "Don't apply toothpaste or butter", hi: "टूथपेस्ट या मक्खन न लगाएं" },
      { en: "Don't pop blisters", hi: "छाले न फोड़ें" }
    ],
    riskFactors: ["face burn", "large area burn", "deep burn", "child burn", "chemical burn"]
  },

  // ── CUTS & WOUNDS ──────────────────────────────────────────────────────────
  cuts: {
    name: "cuts",
    displayName: { en: "Cuts / Wounds / Bleeding", hi: "कट / घाव / खून बहना" },
    keywords: [
      "cut", "wound", "injury", "bleeding", "kaat gaya", "ghav", "khoon aa raha",
      "chot lagi", "chot", "lacerations", "deep cut", "gahri chot",
      "blood not stopping", "khoon nahi ruk raha", "bandage", "first aid cut"
    ],
    emergency: false,
    defaultRisk: "Low",
    questions: [
      {
        id: "cut_bleeding",
        text: {
          en: "Is the bleeding heavy and not stopping even after 10 minutes of pressure?",
          hi: "क्या खून बहुत ज़्यादा है और 10 मिनट दबाने के बाद भी नहीं रुक रहा?"
        },
        escalationKeywords: ["yes", "haan", "not stopping", "nahi ruk raha", "heavy", "spurting", "fountain"],
        escalateTo: "Emergency"
      },
      {
        id: "cut_tetanus",
        text: {
          en: "Was it caused by a rusty object, dirty knife, or animal scratch/bite?",
          hi: "क्या यह जंग लगी चीज़, गंदे चाकू, या जानवर के खरोंच/काटने से हुआ?"
        },
        escalationKeywords: ["yes", "haan", "rusty", "zang", "dirty", "animal", "janwar", "dog", "kutta"],
        escalateTo: "High"
      }
    ],
    firstAid: [
      { en: "Apply firm, direct pressure on the wound with a clean cloth", hi: "साफ कपड़े से घाव पर मज़बूती से सीधा दबाव डालें" },
      { en: "Elevate the injured part above heart level", hi: "घायल अंग को दिल के स्तर से ऊपर उठाएं" },
      { en: "Clean wound with clean water and mild soap after bleeding stops", hi: "खून रुकने के बाद साफ पानी और हल्के साबुन से घाव साफ करें" },
      { en: "Apply antiseptic (Dettol/Savlon) and cover with sterile bandage", hi: "एंटीसेप्टिक (Dettol/Savlon) लगाएं और स्टेराइल बैंडेज से ढकें" },
      { en: "For deep/large cuts — go to hospital for stitches", hi: "गहरे/बड़े कट के लिए — टांके लगाने के लिए अस्पताल जाएं" }
    ],
    doctorAdvice: {
      en: "Go to hospital for deep wounds, wounds that won't stop bleeding, wounds from animal bites (rabies risk), or rusty object injuries (tetanus risk).",
      hi: "गहरे घावों, न रुकने वाले खून, जानवर के काटने (रेबीज़ जोखिम), या जंग लगी चीज़ से चोट (टेटनस जोखिम) के लिए अस्पताल जाएं।"
    },
    dos: [
      { en: "Apply firm pressure to stop bleeding", hi: "खून रोकने के लिए मज़बूत दबाव डालें" },
      { en: "Clean wound thoroughly", hi: "घाव को अच्छी तरह साफ करें" }
    ],
    donts: [
      { en: "Don't remove embedded objects from wound", hi: "घाव में फंसी चीज़ें न निकालें" },
      { en: "Don't use cotton wool directly on wound", hi: "रुई सीधे घाव पर न रखें" }
    ],
    riskFactors: ["arterial bleeding", "deep penetrating wound", "animal bite", "rusty object", "face wound"]
  },

  // ── SNAKE BITE ─────────────────────────────────────────────────────────────
  snakeBite: {
    name: "snakeBite",
    displayName: { en: "Snake Bite", hi: "सांप का काटना" },
    keywords: [
      "snake bite", "sanp kata", "saap ne kaata", "saanp ne kaata",
      "snake attack", "snake poison", "zeher", "snake venom",
      "saap ka zeher", "sanp ka daank", "cobra", "viper"
    ],
    emergency: true,
    defaultRisk: "Emergency",
    questions: [
      {
        id: "snakebite_symptoms",
        text: {
          en: "Are you feeling numbness, difficulty swallowing, blurred vision, or difficulty breathing?",
          hi: "क्या सुन्नपन, निगलने में तकलीफ, धुंधली दृष्टि, या सांस लेने में कठिनाई हो रही है?"
        },
        escalationKeywords: ["yes", "haan", "numb", "sunna", "can't swallow", "blurred", "breathing"],
        escalateTo: "Emergency"
      }
    ],
    firstAid: [
      { en: "🚨 CALL 112/108 IMMEDIATELY — Snake bite is a medical emergency", hi: "🚨 तुरंत 112/108 पर कॉल करें — सांप का काटना एक चिकित्सा आपातकाल है" },
      { en: "Keep the person STILL and CALM — movement speeds venom absorption", hi: "व्यक्ति को स्थिर और शांत रखें — हिलने से ज़हर तेज़ी से फैलता है" },
      { en: "Keep the bitten limb BELOW heart level", hi: "काटे गए अंग को दिल के स्तर से नीचे रखें" },
      { en: "Remove rings, watches, tight clothing near the bite", hi: "काटे के पास की अंगूठी, घड़ी, तंग कपड़े हटाएं" },
      { en: "DO NOT cut/suck the bite or apply tourniquet — these cause more harm", hi: "काट को काटें/चूसें नहीं, टूर्निकेट न बांधें — इससे ज़्यादा नुकसान होता है" },
      { en: "Mark the edge of any swelling with pen and note the time", hi: "सूजन की सीमा पेन से चिह्नित करें और समय नोट करें" }
    ],
    doctorAdvice: {
      en: "EMERGENCY: Rush to nearest government hospital immediately. Anti-venom is only available at hospitals. Do not waste time on home remedies.",
      hi: "आपातकाल: तुरंत निकटतम सरकारी अस्पताल पहुंचें। एंटी-वेनम केवल अस्पतालों में उपलब्ध है। घरेलू उपचारों पर समय बर्बाद न करें।"
    },
    dos: [
      { en: "Keep person still and calm", hi: "व्यक्ति को शांत रखें" },
      { en: "Call 112/108 immediately", hi: "तुरंत 112/108 पर कॉल करें" }
    ],
    donts: [
      { en: "Don't cut or suck the bite", hi: "काट को काटें या चूसें नहीं" },
      { en: "Don't apply tourniquet or ice", hi: "टूर्निकेट या बर्फ न लगाएं" },
      { en: "Don't give alcohol or food", hi: "शराब या खाना न दें" }
    ],
    riskFactors: ["any snake bite is an emergency", "venomous snake identification", "neurological symptoms"]
  },

  // ── PREGNANCY ──────────────────────────────────────────────────────────────
  pregnancy: {
    name: "pregnancy",
    displayName: { en: "Pregnancy Related", hi: "गर्भावस्था संबंधित" },
    keywords: [
      "pregnancy", "pregnant", "garbhavati", "garbh", "pet me bacha",
      "delivery", "prasav", "labour", "labor", "labor pain", "prasav peeda",
      "bleeding pregnancy", "morning sickness", "prenatal", "antenatal",
      "third trimester", "nausea pregnancy", "baby movement", "garbhvati"
    ],
    emergency: false,
    defaultRisk: "Medium",
    questions: [
      {
        id: "pregnancy_trimester",
        text: {
          en: "How many months pregnant are you?",
          hi: "आप कितने महीने की गर्भवती हैं?"
        }
      },
      {
        id: "pregnancy_bleeding",
        text: {
          en: "Are you experiencing vaginal bleeding or leaking fluid?",
          hi: "क्या योनि से खून बह रहा है या पानी आ रहा है?"
        },
        escalationKeywords: ["yes", "haan", "blood", "khoon", "leaking", "fluid", "paani"],
        escalateTo: "Emergency"
      },
      {
        id: "pregnancy_pain",
        text: {
          en: "Do you have severe abdominal pain, severe headache, or swollen hands/face?",
          hi: "क्या पेट में तेज़ दर्द, तेज़ सिरदर्द, या हाथों/चेहरे में सूजन है?"
        },
        escalationKeywords: ["yes", "haan", "severe", "bahut dard", "swollen", "sooja"],
        escalateTo: "Emergency"
      }
    ],
    firstAid: [
      { en: "Morning sickness: Eat small, frequent meals; ginger tea helps; avoid strong smells", hi: "मॉर्निंग सिकनेस: छोटे-छोटे बार-बार भोजन करें; अदरक की चाय पियें; तेज़ गंध से बचें" },
      { en: "Back pain: Use a pregnancy pillow, avoid heavy lifting, gentle stretching", hi: "पीठ दर्द: प्रेगनेंसी पिलो का उपयोग करें, भारी उठाने से बचें, हल्की स्ट्रेचिंग करें" },
      { en: "Swollen feet: Elevate feet when resting, walk regularly", hi: "पैरों में सूजन: आराम करते समय पैर ऊंचे रखें, नियमित रूप से चलें" },
      { en: "Take prescribed folic acid and iron tablets regularly", hi: "निर्धारित फोलिक एसिड और आयरन की गोलियां नियमित लें" }
    ],
    doctorAdvice: {
      en: "EMERGENCY: Go to hospital immediately for vaginal bleeding, severe abdominal pain, no fetal movement (after 28 weeks), fever >101°F, or sudden severe headache/swelling.",
      hi: "आपातकाल: योनि से खून, पेट में तेज़ दर्द, बच्चे की हलचल न हो (28 हफ्ते बाद), बुखार >101°F, या अचानक तेज़ सिरदर्द/सूजन के लिए तुरंत अस्पताल जाएं।"
    },
    dos: [
      { en: "Attend all antenatal checkups", hi: "सभी प्रसव पूर्व जांचों में जाएं" },
      { en: "Eat nutritious diet — iron, calcium, folic acid rich food", hi: "पौष्टिक आहार लें — आयरन, कैल्शियम, फोलिक एसिड युक्त भोजन" }
    ],
    donts: [
      { en: "Don't self-medicate during pregnancy", hi: "गर्भावस्था में स्वयं दवाई न लें" },
      { en: "Avoid alcohol, smoking, and raw/undercooked food", hi: "शराब, धूम्रपान, और कच्चे/अधपके खाने से बचें" }
    ],
    riskFactors: ["vaginal bleeding", "no fetal movement", "severe headache/swelling", "fever in pregnancy"]
  },

  // ── STOMACH PAIN ───────────────────────────────────────────────────────────
  stomachPain: {
    name: "stomachPain",
    displayName: { en: "Stomach Pain", hi: "पेट दर्द" },
    keywords: [
      "stomach pain", "stomach ache", "pet dard", "pet me dard", "abdominal pain",
      "tummy ache", "pait dard", "pait me dard", "navel pain", "nabi ke paas dard",
      "side pain", "appendix", "cramps", "marod", "gas pain", "gas"
    ],
    emergency: false,
    defaultRisk: "Low",
    questions: [
      {
        id: "stomach_location",
        text: {
          en: "Where is the pain — upper stomach, lower right, lower left, or around the navel?",
          hi: "दर्द कहाँ है — ऊपर, नीचे दाएं, नीचे बाएं, या नाभि के आसपास?"
        },
        escalationKeywords: ["lower right", "niche daaye", "appendix", "right side"],
        escalateTo: "High"
      },
      {
        id: "stomach_severity",
        text: {
          en: "Is the pain constant and getting worse, or does it come and go?",
          hi: "क्या दर्द लगातार है और बढ़ रहा है, या रुक-रुक कर आता है?"
        },
        escalationKeywords: ["constant", "getting worse", "unbearable", "sharp", "severe"],
        escalateTo: "High"
      },
      {
        id: "stomach_nausea",
        text: {
          en: "Do you have vomiting, loose motions, or fever along with the pain?",
          hi: "क्या दर्द के साथ उल्टी, दस्त, या बुखार भी है?"
        }
      }
    ],
    firstAid: [
      { en: "For gas pain: Hing (asafoetida) water, OTC antacids (Gelusil/Eno)", hi: "गैस दर्द के लिए: हींग का पानी, एंटासिड (Gelusil/Eno)" },
      { en: "Apply a warm compress/hot water bottle on the stomach", hi: "पेट पर गर्म सेंक/हॉट वाटर बोतल रखें" },
      { en: "Rest and avoid heavy meals", hi: "आराम करें और भारी भोजन से बचें" },
      { en: "Drink ORS or plain water — avoid spicy/oily food", hi: "ORS या सादा पानी पियें — मसालेदार/तैलीय खाने से बचें" }
    ],
    doctorAdvice: {
      en: "Seek emergency help for severe pain in lower right abdomen (possible appendicitis), pain with high fever, or pain not relieved by any position.",
      hi: "पेट के नीचे दाईं तरफ तेज़ दर्द (संभावित अपेंडिसाइटिस), तेज़ बुखार के साथ दर्द, या किसी भी स्थिति से न मिटने वाले दर्द के लिए आपातकालीन सहायता लें।"
    },
    dos: [
      { en: "Rest and drink fluids", hi: "आराम करें और तरल पदार्थ पियें" },
      { en: "Eat light food", hi: "हल्का खाना खाएं" }
    ],
    donts: [
      { en: "Don't ignore severe lower right abdominal pain", hi: "पेट के नीचे दाईं तरफ तेज़ दर्द को नज़रअंदाज़ न करें" },
      { en: "Avoid spicy and oily food", hi: "मसालेदार और तैलीय खाने से बचें" }
    ],
    riskFactors: ["lower right pain (appendix)", "severe pain unresponsive to position", "pain with high fever"]
  }

};

// ─────────────────────────────────────────────────────────────────────────────
// EMERGENCY KEYWORD DICTIONARY
// Used by the fast-path EmergencyDetector
// ─────────────────────────────────────────────────────────────────────────────

export const EMERGENCY_KEYWORDS: string[] = [
  // Cardiac
  "chest pain", "seene me dard", "heart attack", "dil ka daura", "angina",
  "cardiac arrest", "dil band", "left chest pain", "baya seena dard",
  // Breathing
  "can't breathe", "saas nahi aa rahi", "saas band ho gayi", "breathless",
  "suffocating", "ghut raha", "breathing stopped", "respiratory arrest",
  // Stroke
  "stroke", "paralysis", "laqwa", "face drooping", "chehra tircha",
  "sudden arm weakness", "baah me achanak kamzori", "speech difficulty",
  "baat nahi kar pa raha",
  // Unconscious
  "unconscious", "behosh", "faint", "murcha", "not responding",
  "jawab nahi de raha", "coma",
  // Severe bleeding
  "heavy bleeding", "bahut khoon", "blood not stopping", "khoon nahi ruk raha",
  "arterial bleeding",
  // Snake bite
  "snake bite", "sanp ne kaata", "saanp ne kaata", "snake poison",
  // Pregnancy emergency
  "labour pain", "prasav peeda", "water broke", "paani toot gaya",
  "bleeding pregnancy", "pregnancy me khoon",
  // Severe allergic
  "anaphylaxis", "severe allergy", "throat swelling", "gala band ho raha",
  // Burns
  "severe burn", "bahut jal gaya", "chemical burn", "electrical burn",
  "bijli se jala",
  // Poisoning
  "poison", "zeher", "overdose", "tablet kha li", "dawa zyada le li",
];

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC FIRST AID (when no specific condition matched)
// ─────────────────────────────────────────────────────────────────────────────
export const GENERAL_FIRST_AID = {
  en: `General Health Advice:
• Rest well and stay hydrated.
• Monitor your symptoms — note any changes in severity.
• If symptoms are worsening, seek medical help.
• For non-emergency situations, visit your nearest PHC (Primary Health Centre).
• Government helpline: 104 (Health Helpline)`,
  hi: `सामान्य स्वास्थ्य सलाह:
• अच्छा आराम करें और पानी पीते रहें।
• अपने लक्षणों पर नज़र रखें — गंभीरता में किसी भी बदलाव पर ध्यान दें।
• अगर लक्षण बिगड़ रहे हों तो चिकित्सा सहायता लें।
• गैर-आपातकालीन स्थितियों के लिए, अपने नज़दीकी PHC (प्राथमिक स्वास्थ्य केंद्र) जाएं।
• सरकारी हेल्पलाइन: 104 (स्वास्थ्य हेल्पलाइन)`
};
