export const medicalKnowledge = {

  // ── FEVER ──────────────────────────────────────────────────────────────
  fever: {
    keywords: [
      "fever", "bukhar", "temperature", "temp high", "garam",
      "body hot", "tez bukhar", "high fever", "mild fever",
      "jwar", "badan garam", "thoda bukhar"
    ],
    questions: [
      "Temperature kitna gaya tha?",
      "Kya body pain ya weakness hai?",
      "Kya cough, cold ya throat pain hai?",
      "Koi medicine li hai?"
    ],
    riskFactors: ["high temperature", "long duration fever"]
  },

  // ── HEADACHE ───────────────────────────────────────────────────────────
  headache: {
    keywords: [
      "headache", "sir dard", "head pain", "migraine", "aadha sisi",
      "sir me dard", "sir bhari", "head heavy", "throbbing head"
    ],
    questions: [
      "Dard kaha ho raha hai?",
      "Pain kitna hai 1 se 10 tak?",
      "Kab se headache hai?"
    ]
  },

  // ── CHEST PAIN ─────────────────────────────────────────────────────────
  chestPain: {
    keywords: [
      "chest pain", "chest me pain", "seene me dard", "heart pain",
      "dil me dard", "left chest pain", "baya seena dard"
    ],
    emergency: true,
    questions: [
      "Kya saans lene me dikkat hai?",
      "Pain kitni der se hai?"
    ]
  },

  // ── STOMACH PAIN ───────────────────────────────────────────────────────
  stomachPain: {
    keywords: [
      "stomach pain", "pet dard", "pet me dard", "abdominal pain",
      "pet me marod", "cramps", "gas problem", "bloating"
    ],
    questions: [
      "Dard kaha ho raha hai?",
      "Vomiting ya loose motion hai?"
    ]
  },

  // ── COUGH & COLD ───────────────────────────────────────────────────────
  coughCold: {
    keywords: [
      "cough", "khansi", "cold", "zukam", "sardi", "runny nose",
      "naak behna", "sore throat", "gala kharab", "throat pain",
      "congestion", "stuff nose", "band naak", "flu", "influenza"
    ],
    questions: [
      "Khansi sukhi hai ya balgam wali?",
      "Gale me dard bhi hai?",
      "Kitne din se sardi khansi hai?"
    ],
    riskFactors: ["persistent cough", "blood in cough"]
  },

  // ── DIARRHEA / VOMITING ────────────────────────────────────────────────
  diarrheaVomiting: {
    keywords: [
      "diarrhea", "loose motion", "dast", "pet kharab",
      "vomiting", "ulti", "nausea", "jee machalna",
      "food poisoning", "khana kharab"
    ],
    questions: [
      "Kitni baar loose motion hue?",
      "Kya paani wali ulti hai?",
      "Kuch khaya tha bahar ka?"
    ],
    riskFactors: ["dehydration", "blood in stool"]
  },

  // ── SKIN PROBLEMS ──────────────────────────────────────────────────────
  skinProblems: {
    keywords: [
      "rash", "chakatte", "skin allergy", "khujli", "itching",
      "pimples", "acne", "fungal", "daad", "eczema", "hives",
      "skin infection", "laal daane", "red spots"
    ],
    questions: [
      "Kaha khujli ya rash hai?",
      "Kitne din se hai?",
      "Koi naya sabun ya cream lagaya?"
    ]
  },

  // ── BACK PAIN / JOINT PAIN ─────────────────────────────────────────────
  backJointPain: {
    keywords: [
      "back pain", "kamar dard", "peeth dard", "joint pain",
      "jodo ka dard", "knee pain", "ghutna dard", "arthritis",
      "neck pain", "gardan dard", "shoulder pain"
    ],
    questions: [
      "Dard kab se hai?",
      "Koi chot lagi thi?",
      "Subah me stiffness hai?"
    ]
  },

  // ── BREATHING DIFFICULTY ───────────────────────────────────────────────
  breathingDifficulty: {
    keywords: [
      "breathing problem", "saans ki taklif", "breathless",
      "asthma", "dama", "wheezing", "ghut raha",
      "saans nahi aa rahi", "shortness of breath"
    ],
    emergency: true,
    questions: [
      "Saans lene me kitni dikkat?",
      "Kya asthma ka history hai?",
      "Kya lips ya nails blue ho rahe?"
    ]
  },

  // ── DIABETES SYMPTOMS ──────────────────────────────────────────────────
  diabetesSymptoms: {
    keywords: [
      "diabetes", "sugar", "madhumeh", "high blood sugar",
      "frequent urination", "baar baar peshab", "excessive thirst",
      "bahut pyaas", "weight loss", "wazan kam hona"
    ],
    questions: [
      "Blood sugar level kitna aaya?",
      "Kitne samay se ye symptoms hain?",
      "Family me diabetes ka history hai?"
    ]
  },

  // ── BLOOD PRESSURE ─────────────────────────────────────────────────────
  bloodPressure: {
    keywords: [
      "blood pressure", "bp", "high bp", "low bp", "raktchap",
      "chakkar aa rahe", "dizziness", "fainting feel"
    ],
    questions: [
      "BP reading kitni aayi?",
      "Chakkar ya sir dard hai?",
      "BP ki medicine le rahe ho?"
    ],
    riskFactors: ["very high BP", "headache with high BP"]
  },

  // ── EYE PROBLEMS ───────────────────────────────────────────────────────
  eyeProblems: {
    keywords: [
      "eye pain", "aankh dard", "red eye", "laal aankh",
      "blurry vision", "dhundhla dikhai", "eye irritation",
      "conjunctivitis", "aankh aana"
    ],
    questions: [
      "Ek aankh ya dono?",
      "Kya dhundhla dikhai de raha hai?",
      "Koi chot lagi aankh me?"
    ]
  },

  // ── MENTAL HEALTH ──────────────────────────────────────────────────────
  mentalHealth: {
    keywords: [
      "anxiety", "ghabrahat", "tension", "stress", "depression",
      "udaasi", "neend nahi aa rahi", "insomnia", "panic attack",
      "overthinking", "mood swings", "irritated"
    ],
    questions: [
      "Kitne samay se ye feelings hain?",
      "Neend aur bhookh theek hai?",
      "Kisi se baat ki hai?"
    ]
  },

  // ── BURNS & WOUNDS ─────────────────────────────────────────────────────
  burnsWounds: {
    keywords: [
      "burn", "jalna", "jal gaya", "wound", "ghaav", "cut",
      "kat gaya", "injury", "chot", "bleeding", "khoon nikalna"
    ],
    questions: [
      "Kitna bada ghaav hai?",
      "Khoon ruk raha hai ya nahi?",
      "Kya infection ke signs hain?"
    ]
  },

  // ── PREGNANCY RELATED ──────────────────────────────────────────────────
  pregnancyRelated: {
    keywords: [
      "pregnant", "garbhavati", "pregnancy", "prenatal",
      "morning sickness", "baby movement", "labour pain",
      "prasav", "missed period"
    ],
    questions: [
      "Kitne mahine ki pregnancy hai?",
      "Koi bleeding ya pain hai?",
      "Regular checkup ho raha hai?"
    ]
  },

  // ── CHILD HEALTH ───────────────────────────────────────────────────────
  childHealth: {
    keywords: [
      "baby fever", "bachhe ko bukhar", "child sick", "baby crying",
      "colic", "diaper rash", "teething", "vaccination",
      "breastfeeding", "stunting", "nutrition child"
    ],
    questions: [
      "Bachhe ki umar kya hai?",
      "Bukhar kitna hai?",
      "Kya doodh pee raha hai?"
    ]
  },

  // ── DENTAL PROBLEMS ────────────────────────────────────────────────────
  dentalProblems: {
    keywords: [
      "toothache", "daant dard", "tooth pain", "gum bleeding",
      "masoodo se khoon", "cavity", "dental", "root canal",
      "bad breath", "munh se badboo"
    ],
    questions: [
      "Kaunsa daant dard kar raha hai?",
      "Khaana khate waqt dard hota hai?",
      "Koi swelling hai?"
    ]
  },

  // ── ALLERGIC REACTION ──────────────────────────────────────────────────
  allergicReaction: {
    keywords: [
      "allergy", "allergic reaction", "swelling face",
      "face sujan", "hives", "difficulty breathing allergy",
      "food allergy", "drug allergy", "anaphylaxis"
    ],
    emergency: true,
    questions: [
      "Kis cheez se allergy hui?",
      "Saans me dikkat hai?",
      "Koi swelling hai?"
    ]
  }
};
