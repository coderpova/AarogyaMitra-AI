import MedicalKnowledge from "../models/MedicalKnowledge";
import connectDB from "./mongodb";
import { embed } from "./embed";
// Helper to detect evaluation environment (test mode)
export function isEvalEnvironment(): boolean {
  return process.env.NODE_ENV === "test" || process.env.RAG_EVAL_MODE === "1";
}

export function getCurrentKnowledgeSource(): "MongoDB" | "In-memory seed" {
  return isEvalEnvironment() ? "In-memory seed" : "MongoDB";
}

export interface RetrievedChunk {
  title: string;
  content: string;
  category: string;
  tags: string[];
  source: string;
  sourceUrl?: string;
  language: string;
  evidenceLevel: string;
  medicalTopic: string;
  version: string;
}

// Minimal list of medical keywords for query detection (English, Hinglish, and Devanagari Hindi)
const MEDICAL_KEYWORDS = [
  "fever", "bukhar", "cold", "flu", "cough", "khansi", "zukam", "sardi",
  "dehydration", "dehydrated", "pani ki kami", "ors", "headache", "sir dard", "migraine",
  "blood pressure", "bp", "hypertension", "sugar", "diabetes", "madhumeh",
  "first aid", "wound", "injury", "bleeding", "first-aid", "treatment",
  "symptoms", "pain", "dard", "asthma", "allergy", "sore throat", "gala kharab",
  "vomiting", "ulti", "diarrhea", "dast", "constipation", "kabz", "abdominal pain",
  "pet dard", "back pain", "pith dard", "kamar dard", "sleep", "neend", "nutrition",
  "diet", "exercise", "physical activity", "medication safety", "seek medical care",
  // Devanagari Hindi keywords
  "बुखार", "खांसी", "जुकाम", "सर्दी", "दर्द", "इलाज", "दवा", "दवाई", "बीमारी",
  "घाव", "चोट", "मधुमेह", "शुगर", "रक्तचाप", "ब्लड प्रेशर", "उल्टी", "दस्त",
  "कब्ज", "कमर दर्द", "नींद", "पोषण", "व्यायाम", "गले में खराश"
];

// Adversarial keywords to prevent false positives in medical detection
const ADVERSARIAL_KEYWORDS = [
  "javascript", "program", "code", "economics", "statistics", "math",
  "animation", "css", "html", "software", "development", "algorithm"
];

// Common query stop phrases to normalize queries
const STOP_PHRASES = [
  "how to manage", "how to treat", "how can i", "what is", "symptoms of",
  "treatment for", "home care for", "remedies for", "me kya kare",
  "me kya karna chahiye", "kaise thik kare", "hone par kya kare",
  "kya hota hai", "में क्या करना चाहिए", "का इलाज", "के लक्षण",
  "क्या है", "कैसे ठीक करें", "अब क्या करूं", "अब क्या करें"
];

/**
 * Checks if the user query is medical/health-related and filters out adversarial terms.
 */
export function isMedicalQuery(query: string): boolean {
  if (!query) return false;
  const normalized = query.toLowerCase().trim();
  
  // 1. Check for adversarial keywords first to prevent false positives
  const hasAdversarial = ADVERSARIAL_KEYWORDS.some(word => normalized.includes(word));
  if (hasAdversarial) return false;

  // 2. Return true if any medical keyword matches
  return MEDICAL_KEYWORDS.some(keyword => normalized.includes(keyword));
}

/**
 * Normalizes the user query by removing punctuation and common query phrases.
 */
export function normalizeQuery(query: string): string {
  if (!query) return "";
  // Lowercase and trim whitespace
  let clean = query.toLowerCase().trim();

  // Remove punctuation characters
  clean = clean.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");

  // Remove stop phrases (case‑insensitive)
  for (const phrase of STOP_PHRASES) {
    const regex = new RegExp(`\\b${phrase}\\b`, "gi");
    clean = clean.replace(regex, "");
  }

  // Collapse multiple spaces and trim
  return clean.replace(/\s+/g, " ").trim();
}

const COMMON_STOP_WORDS = new Set([
  "the", "and", "for", "are", "what", "how", "can", "should", "now", "with",
  "kya", "hai", "me", "ko", "se", "mera", "meri", "mere", "kare", "karu", "karna", "rehta", "raha", "rahi",
  "अब", "क्या", "करें", "करूं", "करना", "चाहिए", "होने", "पर", "के", "में", "का", "की", "है", "हुआ", "हुई", "रहे", "रहा", "रही", "था", "थी", "थे"
]);

/**
 * Calculates a deterministic relevance score for a retrieved chunk.
 */
export function calculateRelevanceScore(
  normalizedQuery: string,
  doc: { title: string; category: string; tags: string[]; content: string },
  textScore = 1.0
): number {
  let score = textScore;
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length >= 2 && !COMMON_STOP_WORDS.has(w));
  if (queryWords.length === 0) return score;

  const docTitle = doc.title.toLowerCase();
  const docCategory = doc.category.toLowerCase();

  // Title match (high weight)
  if (docTitle.includes(normalizedQuery) || normalizedQuery.includes(docTitle)) {
    score += 10.0;
  }

  // Category match
  if (docCategory.includes(normalizedQuery) || normalizedQuery.includes(docCategory)) {
    score += 5.0;
  }

  // Tag match
  doc.tags.forEach(tag => {
    const cleanTag = tag.toLowerCase();
    if (queryWords.includes(cleanTag) || normalizedQuery.includes(cleanTag)) {
      score += 2.0;
    }
  });

  // Content keyword overlap
  const docContentLower = doc.content.toLowerCase();
  queryWords.forEach(word => {
    if (docContentLower.includes(word)) {
      score += 0.5;
    }
  });

  return score;
}

/**
 * Determines if a document has sufficient term overlap with the query.
 */
function hasSufficientTermOverlap(
  normalizedQuery: string,
  doc: { title?: string; category?: string; tags?: string[]; content: string },
  minOverlap: number = 0.30
): boolean {
  const queryTerms = normalizedQuery.split(/\s+/).filter(t => t.length >= 2 && !COMMON_STOP_WORDS.has(t));
  if (queryTerms.length === 0) return true;
  const searchableText = `${doc.title || ""} ${doc.category || ""} ${(doc.tags || []).join(" ")} ${doc.content}`.toLowerCase();
  const matchCount = queryTerms.filter(term => searchableText.includes(term)).length;
  return (matchCount / queryTerms.length) >= minOverlap;
}

interface CachedRagResult {
  timestamp: number;
  chunks: RetrievedChunk[];
}

const RAG_CACHE = new Map<string, CachedRagResult>();
const RAG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
const MAX_RAG_CACHE_SIZE = 300;

export function clearRagCache(): void {
  RAG_CACHE.clear();
}

export function getRagCacheSize(): number {
  return RAG_CACHE.size;
}

/**
 * Retrieves the top K most relevant medical knowledge chunks from MongoDB using text search.
 * Validates against a configurable relevance score threshold.
 * Uses bounded safe TTL caching for repeated general medical queries to minimize MongoDB Atlas round trips.
 */
export async function retrieveKnowledge(query: string, limit = 3): Promise<RetrievedChunk[]> {
  const normalized = normalizeQuery(query);
  const minThreshold = parseFloat(process.env.RAG_MIN_RELEVANCE_SCORE ?? "1.0");
  const minOverlap = parseFloat(process.env.RAG_MIN_TERM_OVERLAP ?? "0.30");
  const useVector = process.env.RAG_USE_VECTOR_SEARCH === "true" || process.env.RAG_USE_VECTOR_SEARCH === "1";
  const similarityThreshold = parseFloat(process.env.RAG_VECTOR_SIMILARITY_THRESHOLD ?? "0.65");

  const cacheKey = `${normalized}:${limit}:${useVector ? "vec" : "txt"}`;

  // Check TTL cache
  const cached = RAG_CACHE.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < RAG_CACHE_TTL_MS)) {
    return cached.chunks;
  }

  let queryEmbedding: number[] | null = null;
  if (useVector) {
    try {
      queryEmbedding = await embed(normalized);
    } catch (e) {
      console.warn("[RAG] Embedding generation failed, falling back to keyword search", e);
      queryEmbedding = null;
    }
  }

  let results: any[] = [];
  let usedVectorSearch = false;

  try {
    if (isEvalEnvironment()) {
      // In-memory / Evaluation Mode
      const queryTerms = normalized.split(/\s+/).filter(w => w.length > 2);
      results = SEED_MEDICAL_KNOWLEDGE.filter(doc =>
        queryTerms.some(term =>
          doc.title.toLowerCase().includes(term) ||
          doc.content.toLowerCase().includes(term)
        )
      ).map(doc => ({ ...doc, score: 1.0 }));
    } else {
      // MongoDB Mode
      await connectDB();

      if (useVector && queryEmbedding) {
        try {
          const vectorPipeline = [
            {
              $vectorSearch: {
                index: "vector_index",
                path: "embedding",
                queryVector: queryEmbedding,
                numCandidates: 50,
                limit: limit * 2
              }
            },
            {
              $project: {
                title: 1,
                content: 1,
                category: 1,
                tags: 1,
                source: 1,
                sourceUrl: 1,
                language: 1,
                evidenceLevel: 1,
                medicalTopic: 1,
                version: 1,
                score: { $meta: "vectorSearchScore" },
                vectorScore: { $meta: "vectorSearchScore" }
              }
            }
          ];
          results = await MedicalKnowledge.aggregate(vectorPipeline);
          if (results && results.length > 0) {
            usedVectorSearch = true;
          }
        } catch (vecErr) {
          console.warn("[RAG] Real MongoDB $vectorSearch failed, falling back to $text search:", vecErr);
        }
      }

      // If vector search was disabled or returned no candidates, fall back to $text keyword search
      if (!usedVectorSearch || results.length === 0) {
        results = await MedicalKnowledge.find(
          { $text: { $search: normalized } },
          { score: { $meta: "textScore" } }
        )
          .sort({ score: { $meta: "textScore" } })
          .limit(limit)
          .lean()
          .exec();
      }
    }
  } catch (e) {
    console.warn("[RAG] DB connection failed or unavailable, using seed data fallback");
    const queryTerms = normalized.split(/\s+/).filter(w => w.length > 2);
    results = SEED_MEDICAL_KNOWLEDGE.filter(doc =>
      queryTerms.some(term =>
        doc.title.toLowerCase().includes(term) ||
        doc.content.toLowerCase().includes(term)
      )
    ).map(doc => ({ ...doc, score: 1.0 }));
  }

  const scoredChunks: any[] = [];
  for (const r of results || []) {
    const doc = r as {
      title: string;
      content: string;
      category: string;
      tags?: string[];
      source: string;
      sourceUrl?: string;
      language?: string;
      evidenceLevel?: string;
      medicalTopic?: string;
      version?: string;
      score?: number;
      vectorScore?: number;
      embedding?: number[];
    };
    const baseScore = doc.score ?? 1.0;
    const relevanceScore = calculateRelevanceScore(normalized, {
      title: doc.title,
      category: doc.category,
      tags: doc.tags || [],
      content: doc.content,
    }, baseScore);

    // Vector similarity score
    let vectorScore = doc.vectorScore ?? 0;
    if (!vectorScore && useVector && queryEmbedding) {
      if (doc.embedding && doc.embedding.length > 0) {
        const dot = queryEmbedding.reduce((acc, val, i) => acc + val * (doc.embedding![i] ?? 0), 0);
        const normA = Math.sqrt(queryEmbedding.reduce((acc, val) => acc + val * val, 0));
        const normB = Math.sqrt(doc.embedding.reduce((acc, val) => acc + val * val, 0));
        const cosine = normA && normB ? dot / (normA * normB) : 0;
        vectorScore = cosine;
      } else {
        try {
          const docEmbedding = await embed(doc.content);
          if (docEmbedding) {
            const dot = queryEmbedding.reduce((acc, val, i) => acc + val * (docEmbedding[i] ?? 0), 0);
            const normA = Math.sqrt(queryEmbedding.reduce((acc, val) => acc + val * val, 0));
            const normB = Math.sqrt(docEmbedding.reduce((acc, val) => acc + val * val, 0));
            const cosine = normA && normB ? dot / (normA * normB) : 0;
            vectorScore = cosine;
            doc.embedding = docEmbedding;
          }
        } catch {
          // ignore embedding errors
        }
      }
    }

    const combinedScore = (useVector && vectorScore >= similarityThreshold)
      ? (vectorScore * 10 + relevanceScore)
      : relevanceScore;

    scoredChunks.push({
      chunk: {
        title: doc.title,
        content: doc.content,
        category: doc.category,
        tags: doc.tags || [],
        source: doc.source,
        sourceUrl: doc.sourceUrl,
        language: doc.language || "en",
        evidenceLevel: doc.evidenceLevel || "General Health Guidance",
        medicalTopic: doc.medicalTopic || "General Medicine",
        version: doc.version || "1.0.0",
      },
      score: combinedScore,
      content: doc.content,
    });
  }

  const overlapFiltered = scoredChunks.filter(item =>
    (useVector && item.score >= 5.0) ||
    hasSufficientTermOverlap(normalized, {
      title: item.chunk.title,
      category: item.chunk.category,
      tags: item.chunk.tags,
      content: item.content
    }, minOverlap)
  );

  const filteredSorted = overlapFiltered
    .filter(item => item.score >= minThreshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.chunk);

  // Store in bounded TTL cache
  if (RAG_CACHE.size >= MAX_RAG_CACHE_SIZE) {
    const firstKey = RAG_CACHE.keys().next().value;
    if (firstKey) RAG_CACHE.delete(firstKey);
  }
  RAG_CACHE.set(cacheKey, {
    timestamp: Date.now(),
    chunks: filteredSorted,
  });

  return filteredSorted;
}


// Verified Seed Data List with Conservative Evidence Levels and Real Source Citations (33 documents total)
export const SEED_MEDICAL_KNOWLEDGE = [
  // --- ENGLISH CHUNKS (20 chunks) ---
  {
    title: "Fever Management",
    content: "A fever is a temporary increase in body temperature, often due to an illness. For adults, a fever is generally defined as a body temperature of 100.4°F (38°C) or higher. Safe management includes staying well-hydrated with water or oral rehydration solutions, resting, and using over-the-counter fever reducers like paracetamol (acetaminophen). Avoid aspirin for children due to the risk of Reye's syndrome. Consult a healthcare provider if the fever exceeds 103°F (39.4°C), lasts more than 3 days, or is accompanied by severe headache, stiff neck, or breathing difficulty.",
    category: "Fever",
    tags: ["fever", "bukhar", "temperature", "body hot", "body pain", "acetaminophen", "paracetamol", "बुखार", "तापमान", "पेरासिटामोल"],
    source: "Mayo Clinic",
    sourceUrl: "https://www.mayoclinic.org/diseases-conditions/fever/symptoms-causes/syc-20352759",
    language: "en",
    evidenceLevel: "Trusted Medical Reference",
    medicalTopic: "Infectious Diseases",
    version: "1.0.0"
  },
  {
    title: "Dehydration Recovery",
    content: "Dehydration occurs when the body loses more fluids than it takes in. Mild to moderate dehydration is safely managed by oral rehydration therapy (ORT) using Oral Rehydration Salts (ORS) dissolved in clean water, or fluids like coconut water, broth, or salted rice water. Avoid sugary juices and sodas. Key symptoms include dry mouth, dark urine, extreme thirst, and dizziness. Severe dehydration, indicated by lethargy, sunken eyes, or inability to drink, is a medical emergency requiring intravenous fluids.",
    category: "Dehydration",
    tags: ["dehydration", "pani ki kami", "ors", "rehydration", "vomiting", "diarrhea", "dast", "dizziness", "dry mouth", "डीहाइड्रेशन", "पानी की कमी", "ओआरएस", "उल्टी", "दस्त"],
    source: "World Health Organization (WHO)",
    sourceUrl: "https://www.who.int/publications/i/item/WHO-FCH-CAH-06.1",
    language: "en",
    evidenceLevel: "Government / Health Authority",
    medicalTopic: "General Medicine",
    version: "1.0.0"
  },
  {
    title: "Common Cold Guidance",
    content: "The common cold is a viral infection of the upper respiratory tract. Typical symptoms include runny nose, sore throat, cough, and congestion. It is self-limiting and resolves in 7-10 days. Management is supportive: rest, fluid intake, saline nasal sprays, and throat lozenges. Antibiotics are ineffective against viral colds. Seek medical care if symptoms worsen, last longer than 10 days, or include breathing difficulty or high fever.",
    category: "Common Cold",
    tags: ["cold", "cough", "zukam", "khansi", "sardi", "throat pain", "gala kharab", "sore throat", "congestion", "runny nose", "सर्दी", "खांसी", "जुकाम", "गला"],
    source: "Centers for Disease Control and Prevention (CDC)",
    sourceUrl: "https://www.cdc.gov/common-cold/index.html",
    language: "en",
    evidenceLevel: "Government / Health Authority",
    medicalTopic: "Infectious Diseases",
    version: "1.0.0"
  },
  {
    title: "Hypertension (High Blood Pressure) Overview",
    content: "Hypertension (high blood pressure) is a chronic medical condition where the force of the blood against artery walls is consistently too high (130/80 mmHg or higher). Long-term management requires lifestyle changes: a low-sodium diet (under 2,000 mg/day), regular aerobic exercise (150 minutes/week), stress management, and prescribed antihypertensive medications. A blood pressure reading of 180/120 mmHg or higher with symptoms like chest pain, shortness of breath, or vision changes indicates a hypertensive crisis requiring immediate emergency care.",
    category: "Hypertension",
    tags: ["blood pressure", "bp", "hypertension", "high bp", "dizziness", "chest pain", "heart", "sodium", "salt", "रक्तचाप", "ब्लड प्रेशर", "बीपी", "raktchap"],
    source: "American Heart Association (AHA)",
    sourceUrl: "https://www.heart.org/en/health-topics/high-blood-pressure",
    language: "en",
    evidenceLevel: "Clinical Guideline",
    medicalTopic: "Cardiology",
    version: "1.0.0"
  },
  {
    title: "Diabetes Management Guidelines",
    content: "Diabetes is a chronic metabolic disease characterized by elevated blood glucose levels. Type 2 diabetes management focuses on monitoring blood glucose, healthy eating (managing carbohydrate intake), weight control, regular exercise, and medications (e.g. metformin or insulin) as prescribed. Keep fast-acting carbohydrates (like glucose tablets or fruit juice) available to treat hypoglycemia (blood sugar below 70 mg/dL). Regular screening for microvascular complications (kidneys, eyes, feet) is essential.",
    category: "Diabetes",
    tags: ["sugar", "diabetes", "madhumeh", "glucose", "insulin", "metformin", "high sugar", "hypoglycemia", "शुगर", "मधुमेह"],
    source: "American Diabetes Association (ADA)",
    sourceUrl: "https://www.diabetes.org/diabetes",
    language: "en",
    evidenceLevel: "Clinical Guideline",
    medicalTopic: "Endocrinology",
    version: "1.0.0"
  },
  {
    title: "Headache Management",
    content: "Headaches can be primary (tension, migraine, cluster) or secondary (caused by another condition). Safe management for primary headaches includes resting in a quiet, dark room, applying cold or warm compresses, staying hydrated, and using over-the-counter pain relievers like paracetamol or ibuprofen. Avoid overusing pain medication to prevent rebound headaches. Seek emergency care if a headache is sudden and severe (thunderclap), or accompanied by fever, stiff neck, confusion, numbness, or difficulty speaking.",
    category: "Headache",
    tags: ["headache", "sir dard", "migraine", "head pain", "dizziness", "tension headache", "सिर दर्द", "माइग्रेन"],
    source: "Mayo Clinic",
    sourceUrl: "https://www.mayoclinic.org/symptoms/headache/basics/definition/sym-20050800",
    language: "en",
    evidenceLevel: "Trusted Medical Reference",
    medicalTopic: "Neurology",
    version: "1.0.0"
  },
  {
    title: "Basic First Aid for Wounds",
    content: "For minor wounds, clean the injury by rinsing with clean running water to remove dirt. Clean the area around the wound with soap, but avoid getting soap directly in the wound. Apply direct pressure with a clean sterile bandage to control bleeding. Apply a thin layer of petroleum jelly or antibiotic ointment if desired, and cover with a sterile bandage. Seek medical attention if the wound is deep, bleeding is uncontrollable, or shows signs of infection (redness, swelling, warmth, pus).",
    category: "First Aid",
    tags: ["first aid", "wound", "bleeding", "cut", "injury", "bandage", "first-aid", "blood", "chot", "ghaav", "प्राथमिक उपचार", "घाव", "चोट", "पट्टी"],
    source: "American Red Cross",
    sourceUrl: "https://www.redcross.org/take-a-class/first-aid",
    language: "en",
    evidenceLevel: "Clinical Guideline",
    medicalTopic: "General Medicine",
    version: "1.0.0"
  },
  {
    title: "Emergency Warning Signs",
    content: "Seek immediate emergency medical care if you experience warning signs of life-threatening conditions, including chest pain or pressure, severe shortness of breath or difficulty breathing, sudden numbness or weakness (especially on one side of the body), sudden confusion or difficulty speaking, sudden changes in vision, sudden severe headache, or sudden severe dizziness/loss of balance.",
    category: "Emergency",
    tags: ["emergency", "warning signs", "danger", "chest pain", "breathing difficulty", "shortness of breath", "stroke", "heart attack"],
    source: "Mayo Clinic",
    sourceUrl: "https://www.mayoclinic.org/symptoms",
    language: "en",
    evidenceLevel: "Trusted Medical Reference",
    medicalTopic: "General Medicine",
    version: "1.0.0"
  },
  {
    title: "Cough Relief Guidance",
    content: "A cough is a natural reflex to clear your airways of irritants and mucus. Supportive self-care includes staying well-hydrated, drinking warm tea with honey (avoid honey for infants under 1 year), and using a humidifier. Avoid antibiotics unless a bacterial infection is diagnosed. Seek medical attention if the cough lasts longer than 3 weeks, produces blood or rust-colored mucus, or is accompanied by chest pain, unexplained weight loss, or persistent hoarseness.",
    category: "Cough",
    tags: ["cough", "khansi", "throat", "irritation", "mucus", "bronchitis", "खांसी"],
    source: "NHS",
    sourceUrl: "https://www.nhs.uk/conditions/cough/",
    language: "en",
    evidenceLevel: "Government / Health Authority",
    medicalTopic: "Infectious Diseases",
    version: "1.0.0"
  },
  {
    title: "Sore Throat Care",
    content: "Sore throat is usually caused by viral infections, such as the common cold or flu. Self-care includes gargling with warm salt water, drinking warm liquids, and using throat lozenges. Antibiotics are only effective for bacterial infections like strep throat, which must be confirmed with a throat swab. Consult a doctor if you experience difficulty swallowing, breathing, a high fever, or if symptoms last longer than 7 days.",
    category: "Sore Throat",
    tags: ["sore throat", "gala kharab", "throat pain", "strep throat", "swallowing pain", "गले में खराश"],
    source: "CDC",
    sourceUrl: "https://www.cdc.gov/group-a-strep/about/sore-throat.html",
    language: "en",
    evidenceLevel: "Government / Health Authority",
    medicalTopic: "Infectious Diseases",
    version: "1.0.0"
  },
  {
    title: "Vomiting Management",
    content: "Vomiting is a symptom of various conditions, such as gastroenteritis or food poisoning. Initial self-care focuses on avoiding solid food until vomiting stops, then introducing clear liquids in small, frequent sips to prevent dehydration. Gradually start bland foods like crackers, toast, or rice. Seek urgent medical attention if vomiting is persistent (more than 24 hours), contains blood or green bile, or is accompanied by severe abdominal pain, stiff neck, or signs of severe dehydration.",
    category: "Vomiting",
    tags: ["vomiting", "ulti", "nausea", "food poisoning", "gastroenteritis", "stomach bug", "उल्टी"],
    source: "Mayo Clinic",
    sourceUrl: "https://www.mayoclinic.org/symptoms/nausea/basics/definition/sym-20050736",
    language: "en",
    evidenceLevel: "Trusted Medical Reference",
    medicalTopic: "General Medicine",
    version: "1.0.0"
  },
  {
    title: "Diarrhea Management",
    content: "Diarrhea is defined as three or more loose or watery stools per day. The critical danger of diarrhea is dehydration. Safe self-care includes drinking Oral Rehydration Salts (ORS) or clean water, broths, and eating soft, easily digestible foods. Do not use anti-diarrheal medications without consulting a healthcare provider, especially if fever or blood in stool is present. Consult a doctor if diarrhea lasts more than 2 days, contains blood or mucus, or is accompanied by a high fever or severe pain.",
    category: "Diarrhea",
    tags: ["diarrhea", "dast", "loose motion", "stomach infection", "ors", "watery stool", "दस्त"],
    source: "World Health Organization (WHO)",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease",
    language: "en",
    evidenceLevel: "Government / Health Authority",
    medicalTopic: "General Medicine",
    version: "1.0.0"
  },
  {
    title: "Constipation Relief",
    content: "Constipation is characterized by infrequent bowel movements (usually fewer than three times a week) or difficulty passing stools. Supportive self-care includes increasing dietary fiber (fruits, vegetables, whole grains), drinking plenty of water, and engaging in regular physical exercise. Do not use laxatives excessively without professional guidance. Consult a doctor if constipation is sudden, severe, lasts more than 2 weeks, or is accompanied by blood in stool, weight loss, or severe abdominal pain.",
    category: "Constipation",
    tags: ["constipation", "kabz", "stool", "fiber", "laxative", "bowel", "कब्ज"],
    source: "NHS",
    sourceUrl: "https://www.nhs.uk/conditions/constipation/",
    language: "en",
    evidenceLevel: "Government / Health Authority",
    medicalTopic: "General Medicine",
    version: "1.0.0"
  },
  {
    title: "Abdominal Pain Guide",
    content: "Abdominal pain can range from mild indigestion to a serious medical emergency. Self-care for mild pain includes resting, eating small bland meals, and staying hydrated. Avoid taking pain relievers like aspirin or ibuprofen as they can irritate the stomach. Seek immediate emergency care if the pain is sudden, severe, localized (such as lower right quadrant for appendicitis), or accompanied by high fever, persistent vomiting, bloody stools, or chest tightness.",
    category: "Abdominal Pain",
    tags: ["abdominal pain", "pet dard", "stomach ache", "cramps", "indigestion", "appendix", "stomach pain"],
    source: "Mayo Clinic",
    sourceUrl: "https://www.mayoclinic.org/symptoms/abdominal-pain/basics/definition/sym-20050728",
    language: "en",
    evidenceLevel: "Trusted Medical Reference",
    medicalTopic: "General Medicine",
    version: "1.0.0"
  },
  {
    title: "Back Pain Care",
    content: "Back pain is common and usually improves within a few weeks with conservative self-care. Stay active by walking and performing light stretches; avoid prolonged bed rest. Apply cold packs for the first 48 hours, followed by warm compresses. Over-the-counter pain relievers can help. Consult a healthcare provider if pain is severe, does not improve, spreads down one or both legs, or is accompanied by numbness, weakness, or unexplained weight loss.",
    category: "Back Pain",
    tags: ["back pain", "pith dard", "kamar dard", "spinal", "posture", "muscle strain", "कमर दर्द"],
    source: "Mayo Clinic",
    sourceUrl: "https://www.mayoclinic.org/diseases-conditions/back-pain/symptoms-causes/syc-20369906",
    language: "en",
    evidenceLevel: "Trusted Medical Reference",
    medicalTopic: "General Medicine",
    version: "1.0.0"
  },
  {
    title: "Sleep Hygiene Basics",
    content: "Good sleep hygiene is vital for physical and mental health. Adults should aim for 7-9 hours of quality sleep per night. Recommended practices include maintaining a consistent sleep schedule, keeping the bedroom dark, quiet, and cool, removing electronic devices from the bed, and avoiding large meals, caffeine, and alcohol before bedtime. Persistent sleep difficulty lasting more than 3 weeks should be evaluated by a healthcare professional.",
    category: "Sleep",
    tags: ["sleep", "neend", "insomnia", "rest", "bedtime", "circadian rhythm", "नींद"],
    source: "Centers for Disease Control and Prevention (CDC)",
    sourceUrl: "https://www.cdc.gov/sleep/about/index.html",
    language: "en",
    evidenceLevel: "Government / Health Authority",
    medicalTopic: "General Medicine",
    version: "1.0.0"
  },
  {
    title: "Nutrition Basics",
    content: "A healthy diet protects against malnutrition and non-communicable diseases. Guidelines include eating a variety of foods (fruits, vegetables, legumes, nuts, whole grains), limiting sugar intake to under 10% of total energy, limiting salt intake to under 5 grams per day (about 1 teaspoon), and restricting saturated fat to under 10% of total energy intake. Ensure adequate hydration with clean water as the primary beverage.",
    category: "Nutrition",
    tags: ["nutrition", "diet", "healthy food", "calories", "salt limit", "hydration", "diet chart", "पोषण"],
    source: "World Health Organization (WHO)",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
    language: "en",
    evidenceLevel: "Government / Health Authority",
    medicalTopic: "General Medicine",
    version: "1.0.0"
  },
  {
    title: "Exercise Basics",
    content: "Regular physical activity is key to preventing heart disease, stroke, type 2 diabetes, and depression. Adults should aim for at least 150-300 minutes of moderate-intensity aerobic activity per week (or 75-150 minutes of vigorous activity), along with muscle-strengthening exercises on 2 or more days. Start slowly and gradually increase intensity. Consult a physician before beginning a new strenuous exercise regimen if you have chronic health conditions.",
    category: "Exercise",
    tags: ["exercise", "workout", "physical activity", "fitness", "aerobic", "strength", "व्यायाम"],
    source: "World Health Organization (WHO)",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/physical-activity",
    language: "en",
    evidenceLevel: "Government / Health Authority",
    medicalTopic: "General Medicine",
    version: "1.0.0"
  },
  {
    title: "Medication Safety Basics",
    content: "Safe medication use prevents adverse drug events. Key practices include keeping an updated list of all medications (prescription and over-the-counter), reading pharmacy labels and patient information leaflets, taking doses exactly as directed, and avoiding doubling doses if one is missed. Do not share prescription medicines. Store all medications in a cool, dry place out of reach of children, and consult a pharmacist or doctor regarding potential drug interactions.",
    category: "Medication Safety",
    tags: ["medication safety", "pill", "prescription", "pharmacy", "drug interaction", "dosage", "side effects"],
    source: "FDA",
    sourceUrl: "https://www.fda.gov/consumers/consumer-updates/my-medicine-record",
    language: "en",
    evidenceLevel: "Government / Health Authority",
    medicalTopic: "General Medicine",
    version: "1.0.0"
  },
  {
    title: "When to Seek Medical Care",
    content: "Knowing when to seek medical care is crucial for early diagnosis and treatment. Consult a healthcare provider if you experience symptoms that are persistent, worsening, or interfering with daily activities. Warning indicators include unexpected weight loss, constant fatigue, a cough lasting over 3 weeks, changes in bowel or bladder habits, or sudden changes in skin moles. Always seek immediate emergency medical care for acute chest pain, sudden weakness, or severe breathing difficulties.",
    category: "Medical Evaluation",
    tags: ["seek medical care", "doctor visit", "checkup", "warning signs", "clinic", "when to consult"],
    source: "Mayo Clinic",
    sourceUrl: "https://www.mayoclinic.org/symptoms",
    language: "en",
    evidenceLevel: "Trusted Medical Reference",
    medicalTopic: "General Medicine",
    version: "1.0.0"
  },

  // --- HINDI CHUNKS (13 chunks) ---
  {
    title: "बुखार प्रबंधन",
    content: "बुखार शरीर के तापमान में एक अस्थायी वृद्धि है, जो अक्सर किसी बीमारी के कारण होती है। वयस्कों के लिए, बुखार को आम तौर पर 100.4°F (38°C) या उससे अधिक के शरीर के तापमान के रूप में परिभाषित किया जाता है। सुरक्षित प्रबंधन में पानी या ओरल रिहाइड्रेशन घोल (ORS) के साथ अच्छी तरह से हाइड्रेटेड रहना, आराम करना और पेरासिटामोल (एसिटामिनोफेन) जैसी काउंटर पर मिलने वाली बुखार कम करने वाली दवाओं का उपयोग करना शामिल है। बच्चों को एस्पिरिन देने से बचें क्योंकि इससे रेये सिंड्रोम का खतरा होता है। यदि बुखार 103°F (39.4°C) से अधिक हो जाता है, 3 दिनों से अधिक समय तक रहता है, या गंभीर सिरदर्द, गर्दन में अकड़न या सांस लेने में कठिनाई होती है, तो तुरंत डॉक्टर से संपर्क करें।",
    category: "Fever",
    tags: ["बुखार", "तापमान", "पेरासिटामोल", "bukhar", "fever", "paracetamol"],
    source: "Mayo Clinic",
    sourceUrl: "https://www.mayoclinic.org/diseases-conditions/fever/symptoms-causes/syc-20352759",
    language: "hi",
    evidenceLevel: "Trusted Medical Reference",
    medicalTopic: "Infectious Diseases",
    version: "1.0.0"
  },
  {
    title: "निर्जलीकरण उपचार",
    content: "निर्जलीकरण (Dehydration) तब होता है जब शरीर में पानी की कमी हो जाती है। हल्के से मध्यम निर्जलीकरण का प्रबंधन साफ पानी में घुले ओरल रिहाइड्रेशन साल्ट (ORS) या नारियल पानी, सूप आदि पीकर किया जाता है। मीठे जूस और सोडा से बचें। मुख्य लक्षणों में मुंह सूखना, गहरा मूत्र, अत्यधिक प्यास और चक्कर आना शामिल हैं। गंभीर निर्जलीकरण, जो सुस्ती, धंसी हुई आंखें, या पीने में असमर्थता से संकेतित होता है, एक चिकित्सा आपातकाल है जिसके लिए नसों के द्वारा तरल पदार्थ (IV fluids) देने की आवश्यकता होती है।",
    category: "Dehydration",
    tags: ["डीहाइड्रेशन", "पानी की कमी", "ओआरएस", "dehydration", "ors", "dast", "ulti"],
    source: "World Health Organization (WHO)",
    sourceUrl: "https://www.who.int/publications/i/item/WHO-FCH-CAH-06.1",
    language: "hi",
    evidenceLevel: "Government / Health Authority",
    medicalTopic: "General Medicine",
    version: "1.0.0"
  },
  {
    title: "सामान्य सर्दी जुकाम निर्देश",
    content: "सामान्य सर्दी श्वसन तंत्र का एक वायरल संक्रमण है। इसके लक्षणों में बहती नाक, गले में खराश, खांसी और बंद नाक शामिल हैं। यह आमतौर पर 7-10 दिनों में ठीक हो जाता है। इसका प्रबंधन सहायक होता है: आराम करें, पर्याप्त तरल पदार्थ लें और गले की खराश के लिए गरारे करें। एंटीबायोटिक्स वायरल सर्दी पर प्रभावी नहीं होते हैं। यदि लक्षण 10 दिनों से अधिक समय तक बने रहें या सांस लेने में कठिनाई हो, तो डॉक्टर से सलाह लें।",
    category: "Common Cold",
    tags: ["सर्दी", "जुकाम", "खांसी", "गला", "sardi", "zukam", "khansi", "cold"],
    source: "Centers for Disease Control and Prevention (CDC)",
    sourceUrl: "https://www.cdc.gov/common-cold/index.html",
    language: "hi",
    evidenceLevel: "Government / Health Authority",
    medicalTopic: "Infectious Diseases",
    version: "1.0.0"
  },
  {
    title: "उच्च रक्तचाप (High BP) जानकारी",
    content: "उच्च रक्तचाप (Hypertension) एक क्रोनिक स्थिति है जहां धमनियों की दीवारों पर रक्त का दबाव लगातार बहुत अधिक (130/80 mmHg या अधिक) होता है। इसके दीर्घकालिक प्रबंधन के लिए जीवनशैली में बदलाव आवश्यक हैं: कम सोडियम (नमक) वाला आहार, नियमित व्यायाम, तनाव प्रबंधन और डॉक्टर द्वारा दी गई दवाएं। यदि रक्तचाप 180/120 mmHg या अधिक हो और साथ में छाती में दर्द या सांस फूलने जैसे लक्षण हों, तो तुरंत आपातकालीन सहायता लें।",
    category: "Hypertension",
    tags: ["रक्तचाप", "ब्लड प्रेशर", "बीपी", "blood pressure", "bp", "hypertension"],
    source: "American Heart Association (AHA)",
    sourceUrl: "https://www.heart.org/en/health-topics/high-blood-pressure",
    language: "hi",
    evidenceLevel: "Clinical Guideline",
    medicalTopic: "Cardiology",
    version: "1.0.0"
  },
  {
    title: "मधुमेह (Diabetes) प्रबंधन",
    content: "मधुमेह रक्त शर्करा (glucose) के बढ़े हुए स्तर की स्थिति है। टाइप 2 मधुमेह के प्रबंधन में रक्त शर्करा की निगरानी, संतुलित आहार, वजन पर नियंत्रण और डॉक्टर के निर्देशानुसार दवाएं (जैसे मेटफॉर्मिन या इंसुलिन) शामिल हैं। यदि रक्त शर्करा 70 mg/dL से नीचे चली जाए (हाइपोग्लाइसीमिया), तो तुरंत ग्लूकोज टैबलेट या फलों का रस लें। किडनी, आंख और पैरों की नियमित जांच आवश्यक है।",
    category: "Diabetes",
    tags: ["शुगर", "मधुमेह", "sugar", "diabetes", "insulin", "madhumeh"],
    source: "American Diabetes Association (ADA)",
    sourceUrl: "https://www.diabetes.org/diabetes",
    language: "hi",
    evidenceLevel: "Clinical Guideline",
    medicalTopic: "Endocrinology",
    version: "1.0.0"
  },
  {
    title: "सिरदर्द प्रबंधन",
    content: "सिरदर्द तनाव, माइग्रेन या अन्य कारणों से हो सकता है। प्राथमिक सिरदर्द के सुरक्षित प्रबंधन में शांत, अंधेरे कमरे में आराम करना, माथे पर ठंडी या गर्म पट्टी लगाना, पर्याप्त पानी पीना और डॉक्टर की सलाह से दर्द निवारक दवाएं लेना शामिल है। दवाओं के अत्यधिक सेवन से बचें। यदि सिरदर्द अचानक और बहुत तीव्र हो, या गर्दन में अकड़न और बुखार के साथ हो, तो तुरंत आपातकालीन उपचार लें।",
    category: "Headache",
    tags: ["सिर दर्द", "माइग्रेन", "headache", "migraine", "sir dard"],
    source: "Mayo Clinic",
    sourceUrl: "https://www.mayoclinic.org/symptoms/headache/basics/definition/sym-20050800",
    language: "hi",
    evidenceLevel: "Trusted Medical Reference",
    medicalTopic: "Neurology",
    version: "1.0.0"
  },
  {
    title: "प्राथमिक चिकित्सा निर्देश",
    content: "छोटी चोटों और घावों के लिए, घाव को साफ बहते पानी से धोएं ताकि गंदगी निकल सके। घाव के आसपास के क्षेत्र को साबुन से साफ करें, लेकिन साबुन को सीधे घाव में न लगाएं। रक्तस्राव को नियंत्रित करने के लिए साफ पट्टी से सीधा दबाव डालें। संक्रमण के लक्षणों (जैसे लालिमा, सूजन, गर्माहट, मवाद) पर नजर रखें और जरूरत पड़ने पर डॉक्टर से संपर्क करें।",
    category: "First Aid",
    tags: ["प्राथमिक उपचार", "घाव", "चोट", "पट्टी", "first aid", "wound", "bleeding"],
    source: "American Red Cross",
    sourceUrl: "https://www.redcross.org/take-a-class/first-aid",
    language: "hi",
    evidenceLevel: "Clinical Guideline",
    medicalTopic: "General Medicine",
    version: "1.0.0"
  },
  {
    title: "आपातकालीन चेतावनी संकेत",
    content: "यदि आप जीवन के लिए खतरा पैदा करने वाली स्थितियों के चेतावनी संकेत महसूस करते हैं, तो तुरंत आपातकालीन चिकित्सा सहायता (112 या 108) लें। इन संकेतों में शामिल हैं: छाती में तेज दर्द या दबाव, सांस लेने में अत्यधिक कठिनाई, शरीर के एक हिस्से में अचानक सुन्नता या कमजोरी, अचानक भ्रम या बोलने में कठिनाई, दृष्टि में बदलाव, या संतुलन खोना।",
    category: "Emergency",
    tags: ["आपातकाल", "चेतावनी संकेत", "खतरा", "emergency", "warning signs", "danger"],
    source: "Mayo Clinic",
    sourceUrl: "https://www.mayoclinic.org/symptoms",
    language: "hi",
    evidenceLevel: "Trusted Medical Reference",
    medicalTopic: "General Medicine",
    version: "1.0.0"
  },
  {
    title: "खांसी का इलाज",
    content: "खांसी वायुमार्ग से बलगम और उत्तेजक पदार्थों को साफ करने की एक प्राकृतिक क्रिया है। घरेलू उपचार में हाइड्रेटेड रहना, शहद और गर्म पानी या चाय पीना (1 वर्ष से कम उम्र के बच्चों को शहद न दें) शामिल हैं। बिना डॉक्टर की सलाह के एंटीबायोटिक्स न लें। यदि खांसी 3 सप्ताह से अधिक समय तक रहे, बलगम में खून आए, या वजन घटने लगे तो डॉक्टर से जांच कराएं।",
    category: "Cough",
    tags: ["खांसी", "गला", "बलगम", "khansi", "cough"],
    source: "NHS",
    sourceUrl: "https://www.nhs.uk/conditions/cough/",
    language: "hi",
    evidenceLevel: "Government / Health Authority",
    medicalTopic: "Infectious Diseases",
    version: "1.0.0"
  },
  {
    title: "गले में खराश के उपाय",
    content: "गले में खराश आमतौर पर सर्दी या फ्लू जैसे वायरल संक्रमण के कारण होती है। राहत के लिए गुनगुने नमक के पानी से गरारे करें, गर्म तरल पदार्थ पिएं और गले की गोलियां (lozenges) चूसें। यदि निगलने या सांस लेने में गंभीर कठिनाई हो, तेज बुखार हो, या खराश 7 दिनों से अधिक समय तक रहे, तो डॉक्टर से सलाह लें।",
    category: "Sore Throat",
    tags: ["गले में खराश", "खराश", "गरारे", "sore throat", "gala kharab"],
    source: "CDC",
    sourceUrl: "https://www.cdc.gov/group-a-strep/about/sore-throat.html",
    language: "hi",
    evidenceLevel: "Government / Health Authority",
    medicalTopic: "Infectious Diseases",
    version: "1.0.0"
  },
  {
    title: "दस्त का उपचार",
    content: "दिन में तीन या अधिक बार पानी जैसा मल आना दस्त कहलाता है। इसका सबसे बड़ा खतरा निर्जलीकरण है। सुरक्षित उपचार में ओआरएस (ORS) घोल, साफ पानी, सूप आदि बार-बार पीना शामिल है ताकि शरीर में पानी और नमक की कमी न हो। डॉक्टर की सलाह के बिना दस्त रोकने वाली दवाएं न लें। यदि दस्त 2 दिन से अधिक रहे या मल में खून आए, तो तुरंत डॉक्टर से मिलें।",
    category: "Diarrhea",
    tags: ["दस्त", "पानी की कमी", "ओआरएस", "diarrhea", "dast", "loose motion"],
    source: "World Health Organization (WHO)",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease",
    language: "hi",
    evidenceLevel: "Government / Health Authority",
    medicalTopic: "General Medicine",
    version: "1.0.0"
  },
  {
    title: "उल्टी का प्रबंधन",
    content: "उल्टी फूड पॉइजनिंग या पेट के संक्रमण के कारण हो सकती है। उल्टी होने पर कुछ समय के लिए ठोस भोजन से बचें और छोटे घूंट में साफ तरल पदार्थ पिएं। जब उल्टी रुक जाए तो हल्के भोजन जैसे टोस्ट, दलिया या चावल शुरू करें। यदि उल्टी 24 घंटे से अधिक रहे, मल में खून या हरा रंग आए, या गंभीर पेट दर्द हो, तो तुरंत डॉक्टर से मिलें।",
    category: "Vomiting",
    tags: ["उल्टी", "जी मिचलाना", "vomiting", "ulti", "nausea"],
    source: "Mayo Clinic",
    sourceUrl: "https://www.mayoclinic.org/symptoms/nausea/basics/definition/sym-20050736",
    language: "hi",
    evidenceLevel: "Trusted Medical Reference",
    medicalTopic: "General Medicine",
    version: "1.0.0"
  },
  {
    title: "नींद के नियम (Sleep Hygiene)",
    content: "अच्छी सेहत के लिए रात में 7-9 घंटे की गुणवत्तापूर्ण नींद आवश्यक है। बेहतर नींद के लिए सोने और जागने का एक निश्चित समय बनाएं। बेडरूम को शांत, अंधेरा और ठंडा रखें। सोने से कम से कम 1 घंटा पहले मोबाइल, लैपटॉप और अन्य स्क्रीन का उपयोग बंद कर दें। शाम के समय चाय, कॉफी या भारी भोजन से बचें।",
    category: "Sleep",
    tags: ["नींद", "सोना", "आराम", "sleep", "neend", "insomnia"],
    source: "Centers for Disease Control and Prevention (CDC)",
    sourceUrl: "https://www.cdc.gov/sleep/about/index.html",
    language: "hi",
    evidenceLevel: "Government / Health Authority",
    medicalTopic: "General Medicine",
    version: "1.0.0"
  }
];

/**
 * Idempotent seed function using upsert matching on { title, language, version }.
 * Prevents duplicates, manual deletes, and unexpected overwrites.
 */
export async function seedMedicalKnowledge(): Promise<number> {
  await connectDB();
  
  try {
    // Drop existing text indexes to apply language_override changes safely
    await MedicalKnowledge.collection.dropIndexes();
    // Recreate indexes immediately
    await MedicalKnowledge.createIndexes();
  } catch (indexErr) {
    console.log("[RAG] Index recreation warning:", indexErr);
  }

  let seededCount = 0;

  for (const doc of SEED_MEDICAL_KNOWLEDGE) {
    const filter = {
      title: doc.title,
      language: doc.language,
      version: doc.version
    };

    await MedicalKnowledge.findOneAndUpdate(
      filter,
      { $set: doc },
      { upsert: true, new: true }
    );
    seededCount++;
  }

  clearRagCache();

  return seededCount;
}

const FILLERS = [
  "ok", "okay", "yes", "no", "thanks", "thank you", "hello", "hi", "hey",
  "sure", "fine", "accha", "haan", "shukriya", "achha", "dhanyawad",
  "धन्यवाद", "ठीक है", "हाँ", "नमस्ते"
];

/**
 * Resolves follow-up ambiguous queries by searching past conversation history for medical context.
 */
export function resolveContextualQuery(
  query: string,
  history?: Array<{ role: string; text: string }>
): string {
  if (!query) return "";
  
  // If the query already explicitly mentions a known medical keyword, keep it as is
  const normalizedQuery = query.toLowerCase();
  const alreadyHasMedical = MEDICAL_KEYWORDS.some(kw => normalizedQuery.includes(kw));
  
  if (alreadyHasMedical) {
    return query;
  }

  // Scan recent history from newest to oldest
  if (history && Array.isArray(history) && history.length > 0) {
    let contextTopic = "";
    
    for (let i = history.length - 1; i >= 0; i--) {
      const turn = history[i];
      if (turn.role !== "user") continue; // only inspect user turns
      
      const turnText = turn.text.toLowerCase().trim();
      const isMed = isMedicalQuery(turn.text);
      
      if (isMed) {
        // Extract the medical keyword from the previous query
        const matchedKeyword = MEDICAL_KEYWORDS.find(keyword => 
          turnText.includes(keyword)
        );
        if (matchedKeyword) {
          contextTopic = matchedKeyword;
          break;
        }
      } else {
        // If it's a non-medical turn, check if it's a topic pivot (not a simple conversational filler)
        const isFiller = FILLERS.some(filler => turnText === filler || turnText.startsWith(filler + " ") || turnText.length <= 4);
        if (!isFiller) {
          // Topic pivot detected (e.g. "Tell me about JavaScript" or a general non-medical question)
          // Stop scanning further back to prevent incorrect context attachment
          break;
        }
      }
    }

    if (contextTopic) {
      console.log(`[Contextual RAG] Resolving ambiguous query "${query}" to include topic "${contextTopic}"`);
      return `${contextTopic} ${query}`;
    }
  }

  return query;
}
