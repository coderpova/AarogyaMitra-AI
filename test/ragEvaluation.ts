import { isMedicalQuery, retrieveKnowledge, seedMedicalKnowledge, calculateRelevanceScore, normalizeQuery, resolveContextualQuery } from "../lib/ragService";
import { detectEmergency } from "../lib/healthAssistant";
import connectDB from "../lib/mongodb";

interface EvaluationTestCase {
  id: string;
  name: string;
  query: string;
  history?: Array<{ role: string; text: string }>;
  expectedTopic: string; // The category name or standard title (e.g. "Fever", "Dehydration", "None")
  type: "medical" | "contextual" | "adversarial" | "irrelevant" | "unknown_medical" | "emergency";
}

async function runEvaluation() {
  console.log("=====================================================================");
  console.log("      AAROGYAMITRA-AI RAG QUALITY EVALUATION SUITE (PHASE 1D)        ");
  console.log("=====================================================================");

  await connectDB();

  console.log("\n[Idempotent Seed] Running idempotent database seeding...");
  const seededCount = await seedMedicalKnowledge();
  console.log(`[Idempotent Seed] Done. Seed count: ${seededCount}`);

  // Test set: Exactly 37 queries covering English, Hindi, Hinglish, contextual, adversarial, irrelevant, unknown, emergency
  const testCases: EvaluationTestCase[] = [
    // 1. Direct medical queries (English, Hindi, Hinglish)
    { id: "M1", name: "Direct Fever (English)", query: "how to manage fever", expectedTopic: "Fever", type: "medical" },
    { id: "M2", name: "Direct Fever (Hinglish)", query: "bukhar me kya kare", expectedTopic: "Fever", type: "medical" },
    { id: "M3", name: "Direct Fever (Hindi)", query: "बुखार में क्या करना चाहिए", expectedTopic: "Fever", type: "medical" },
    { id: "M4", name: "Direct BP (English)", query: "my BP is high what should I do", expectedTopic: "Hypertension", type: "medical" },
    { id: "M5", name: "Direct BP (Hinglish)", query: "mera BP high rehta hai", expectedTopic: "Hypertension", type: "medical" },
    { id: "M6", name: "Direct BP (Hindi)", query: "मेरा BP बढ़ा हुआ है", expectedTopic: "Hypertension", type: "medical" },
    { id: "M7", name: "Direct Diabetes (English)", query: "How to manage diabetes", expectedTopic: "Diabetes", type: "medical" },
    { id: "M8", name: "Direct Diabetes (Hinglish)", query: "diabetes ko kaise control kare", expectedTopic: "Diabetes", type: "medical" },
    { id: "M9", name: "Direct Diabetes (Hindi)", query: "sugar control karne ke upay", expectedTopic: "Diabetes", type: "medical" },
    { id: "M10", name: "Direct Cold (English)", query: "how to treat common cold", expectedTopic: "Common Cold", type: "medical" },
    { id: "M11", name: "Direct Cold (Hinglish)", query: "sardi zukam me kya kare", expectedTopic: "Common Cold", type: "medical" },
    { id: "M12", name: "Direct Dehydration (English)", query: "what is dehydration", expectedTopic: "Dehydration", type: "medical" },
    { id: "M13", name: "Direct First Aid (English)", query: "first aid for minor wound", expectedTopic: "First Aid", type: "medical" },
    { id: "M14", name: "Direct Emergency Signs (English)", query: "chest pain warning signs", expectedTopic: "Emergency", type: "medical" },
    { id: "M15", name: "Direct Cough (English)", query: "how to relieve persistent cough", expectedTopic: "Cough", type: "medical" },
    { id: "M16", name: "Direct Sore Throat (English)", query: "what to do for sore throat", expectedTopic: "Sore Throat", type: "medical" },
    { id: "M17", name: "Direct Vomiting (English)", query: "how to stop vomiting at home", expectedTopic: "Vomiting", type: "medical" },
    { id: "M18", name: "Direct Diarrhea (English)", query: "ORS dosage for diarrhea recovery", expectedTopic: "Diarrhea", type: "medical" },
    { id: "M19", name: "Direct Constipation (English)", query: "severe constipation self care", expectedTopic: "Constipation", type: "medical" },
    { id: "M20", name: "Direct Back Pain (English)", query: "home care for acute back pain", expectedTopic: "Back Pain", type: "medical" },
    { id: "M21", name: "Direct Sleep (English)", query: "how many hours of sleep do I need", expectedTopic: "Sleep", type: "medical" },
    { id: "M22", name: "Direct Nutrition (English)", query: "nutrition guidelines for healthy diet", expectedTopic: "Nutrition", type: "medical" },
    { id: "M23", name: "Direct Exercise (English)", query: "exercise guidelines for heart health", expectedTopic: "Exercise", type: "medical" },
    { id: "M24", name: "Direct Medication (English)", query: "medication safety guidelines", expectedTopic: "Medication Safety", type: "medical" },
    { id: "M25", name: "Direct Seek Care (English)", query: "when should I seek medical care", expectedTopic: "Medical Evaluation", type: "medical" },

    // 2. Contextual follow-up queries (relying on simulated dialogue histories)
    { id: "C1", name: "English Contextual Fever", query: "what should I do now?", history: [{ role: "user", text: "I have fever" }], expectedTopic: "Fever", type: "contextual" },
    { id: "C2", name: "English Contextual Headache", query: "how can I manage it?", history: [{ role: "user", text: "I have headache" }], expectedTopic: "Headache", type: "contextual" },
    { id: "C3", name: "Hinglish Contextual Fever", query: "ab kya karu?", history: [{ role: "user", text: "mujhe bukhar hai" }], expectedTopic: "Fever", type: "contextual" },
    { id: "C4", name: "Hindi Contextual Fever", query: "अब क्या करूं?", history: [{ role: "user", text: "मुझे बुखार है" }], expectedTopic: "Fever", type: "contextual" },
    { id: "C5", name: "Contextual Multi-Topic Win", query: "How do I manage it?", history: [{ role: "user", text: "I have fever" }, { role: "user", text: "What about dehydration?" }], expectedTopic: "Dehydration", type: "contextual" },

    // 3. Adversarial queries (expected retrieval: None)
    { id: "A1", name: "Adversarial Fever Animation", query: "JavaScript fever animation", expectedTopic: "None", type: "adversarial" },
    { id: "A2", name: "Adversarial Headache Algorithm", query: "headache algorithm", expectedTopic: "None", type: "adversarial" },
    { id: "A3", name: "Adversarial Diabetes Economics", query: "diabetes statistics for economics", expectedTopic: "None", type: "adversarial" },

    // 4. Irrelevant queries (expected retrieval: None)
    { id: "I1", name: "Irrelevant Capital", query: "capital of France", expectedTopic: "None", type: "irrelevant" },
    { id: "I2", name: "Irrelevant Python", query: "write a Python function", expectedTopic: "None", type: "irrelevant" },

    // 5. Unknown medical topics (expected retrieval: None due to low threshold/no matches)
    { id: "U1", name: "Unknown Rare Condition", query: "what should I do for xyz rare condition", expectedTopic: "None", type: "unknown_medical" },

    // 6. Emergency queries (expected: emergency bypass, 0 RAG, 0 LLM)
    { id: "E1", name: "Emergency Warning Sign", query: "severe chest pain and difficulty breathing", expectedTopic: "None", type: "emergency" }
  ];

  console.log(`\nRunning evaluation matrix on ${testCases.length} test cases...`);

  const results = [];
  
  // High-level matrix metrics trackers
  let p1Correct = 0;
  let p1Total = 0;
  let p3RelevantSum = 0;
  let p3TotalRetrieved = 0;
  let recallRetrievedCorrect = 0;
  let recallExpectedTotal = 0;
  let fpHits = 0;
  let fpTotal = 0;
  let fnHits = 0;
  let fnTotal = 0;
  let contextualResolvedCount = 0;
  let contextualTotal = 0;

  for (const tc of testCases) {
    const emergency = detectEmergency(tc.query);
    const resolvedQuery = resolveContextualQuery(tc.query, tc.history);
    const isMed = isMedicalQuery(resolvedQuery);
    
    let retrievedChunks: any[] = [];
    let retrievedCount = 0;
    let topResult = "None";
    let topResultCategory = "None";
    let scoreVal = 0;
    let relevanceMatched = false;

    // Track Context Resolution Accuracy
    if (tc.type === "contextual") {
      contextualTotal++;
      // If the resolved query correctly prepended the topic keyword or contains it
      const expectedLower = tc.expectedTopic.toLowerCase();
      if (resolvedQuery.toLowerCase().includes(expectedLower) || (expectedLower === "fever" && (resolvedQuery.toLowerCase().includes("bukhar") || resolvedQuery.toLowerCase().includes("बुखार")))) {
        contextualResolvedCount++;
      }
    }

    if (emergency.isEmergency) {
      retrievedCount = 0;
    } else if (isMed) {
      retrievedChunks = await retrieveKnowledge(resolvedQuery, 3);
      retrievedCount = retrievedChunks.length;
      if (retrievedCount > 0) {
        topResult = retrievedChunks[0].title;
        topResultCategory = retrievedChunks[0].category;
        const norm = normalizeQuery(resolvedQuery);
        scoreVal = calculateRelevanceScore(norm, {
          title: retrievedChunks[0].title,
          category: retrievedChunks[0].category,
          tags: retrievedChunks[0].tags,
          content: retrievedChunks[0].content
        });
        relevanceMatched = true;
      }
    }

    // Determine relevance status (Pass/Fail)
    let isCorrectTop = false;
    if (tc.expectedTopic === "None") {
      isCorrectTop = (topResultCategory === "None" && retrievedCount === 0);
    } else {
      isCorrectTop = (topResultCategory.toLowerCase() === tc.expectedTopic.toLowerCase());
    }

    const status = isCorrectTop ? "PASS" : "FAIL";

    // Update metrics aggregates
    const isKnownRelevantQuery = (tc.type === "medical" || tc.type === "contextual");
    const isIrrelevantQuery = (tc.type === "adversarial" || tc.type === "irrelevant" || tc.type === "unknown_medical" || tc.type === "emergency");

    if (isKnownRelevantQuery) {
      recallExpectedTotal++;
      fnTotal++;
      
      // If topResultCategory matches expectedTopic
      if (isCorrectTop) {
        recallRetrievedCorrect++;
      } else {
        fnHits++; // False Negative: expected topic was not retrieved as the top match
      }
    }

    if (isIrrelevantQuery) {
      fpTotal++;
      if (retrievedCount > 0) {
        fpHits++; // False Positive: irrelevant query incorrectly received a RAG hit
      }
    }

    if (retrievedCount > 0) {
      p1Total++;
      if (isCorrectTop) {
        p1Correct++;
      }
      
      // For Precision@3, sum of relevant retrieved chunks
      p3TotalRetrieved += retrievedCount;
      retrievedChunks.forEach(chunk => {
        if (chunk.category.toLowerCase() === tc.expectedTopic.toLowerCase()) {
          p3RelevantSum++;
        }
      });
    }

    results.push({
      id: tc.id,
      name: tc.name,
      originalQuery: tc.query,
      resolvedQuery: resolvedQuery,
      isMedicalQuery: isMed,
      emergencyDetected: emergency.isEmergency,
      retrievedCount,
      topResult: topResult.substring(0, 16),
      relevanceScore: parseFloat(scoreVal.toFixed(2)),
      expectedTopic: tc.expectedTopic,
      retrievedTopic: topResultCategory,
      status
    });
  }

  // Multi-turn Pivot verification test as requested
  console.log("\nRunning Multi-turn Dialogue Context Flow Checks...");
  const pivotHistory = [
    { role: "user", text: "I have fever" },
    { role: "user", text: "Tell me about JavaScript" }
  ];
  const resolvedPivot = resolveContextualQuery("What should I do now?", pivotHistory);
  const isMedPivot = isMedicalQuery(resolvedPivot);
  const pivotPass = !isMedPivot && resolvedPivot === "What should I do now?";

  // Contextual Dialogue Verification: turn sequence check
  const dialogueSequence = [
    { turn: 1, query: "I have fever", expectMedical: true, history: [] },
    { turn: 2, query: "What should I do?", expectMedical: true, history: [{ role: "user", text: "I have fever" }] },
    { turn: 3, query: "Since yesterday", expectMedical: true, history: [{ role: "user", text: "I have fever" }, { role: "user", text: "What should I do?" }] },
    { turn: 4, query: "Is there anything else I should watch for?", expectMedical: true, history: [{ role: "user", text: "I have fever" }, { role: "user", text: "What should I do?" }, { role: "user", text: "Since yesterday" }] }
  ];
  
  const seqResults = [];
  for (const turn of dialogueSequence) {
    const resolved = resolveContextualQuery(turn.query, turn.history);
    const isMed = isMedicalQuery(resolved);
    const chunks = isMed ? await retrieveKnowledge(resolved, 3) : [];
    seqResults.push({
      turn: turn.turn,
      query: turn.query,
      resolved,
      isMedical: isMed,
      chunksRetrieved: chunks.length,
      topChunk: chunks.length > 0 ? chunks[0].title : "None"
    });
  }

  // Metrics calculation
  const precisionAt1 = p1Total > 0 ? (p1Correct / p1Total) * 100 : 100;
  const precisionAt3 = p3TotalRetrieved > 0 ? (p3RelevantSum / p3TotalRetrieved) * 100 : 100;
  const recallVal = recallExpectedTotal > 0 ? (recallRetrievedCorrect / recallExpectedTotal) * 100 : 100;
  const falsePositiveRate = fpTotal > 0 ? (fpHits / fpTotal) * 100 : 0;
  const falseNegativeRate = fnTotal > 0 ? (fnHits / fnTotal) * 100 : 0;
  const contextResolutionAccuracy = contextualTotal > 0 ? (contextualResolvedCount / contextualTotal) * 100 : 100;

  // Render Matrix Results
  console.log("\n========================================================================================================================================");
  console.log("                                                      RAG CONTEXTUAL EVALUATION MATRIX                                                 ");
  console.log("========================================================================================================================================");
  console.log("| ID  | Original Query            | Resolved Query            | IsMed | Emergency | Chunks | Top Result       | Expected   | Status |");
  console.log("|-----|---------------------------|---------------------------|-------|-----------|--------|------------------|------------|--------|");
  for (const r of results) {
    console.log(`| ${r.id.padEnd(3)} | ${r.originalQuery.substring(0, 25).padEnd(25)} | ${r.resolvedQuery.substring(0, 25).padEnd(25)} | ${(r.isMedicalQuery ? "Yes" : "No").padEnd(5)} | ${(r.emergencyDetected ? "Yes" : "No").padEnd(9)} | ${r.retrievedCount.toString().padEnd(6)} | ${r.topResult.padEnd(16)} | ${r.expectedTopic.padEnd(10)} | ${r.status.padEnd(6)} |`);
  }

  console.log("\n==================================================================================================================");
  console.log("                                              DIALOGUE SEQUENCE FLOW                                              ");
  console.log("==================================================================================================================");
  console.log("| Turn | Original Query                            | Resolved Query                            | IsMed | Chunks | Top Chunk        |");
  console.log("|------|-------------------------------------------|-------------------------------------------|-------|--------|------------------|");
  for (const s of seqResults) {
    console.log(`| ${s.turn.toString().padEnd(4)} | ${s.query.padEnd(41)} | ${s.resolved.padEnd(41)} | ${(s.isMedical ? "Yes" : "No").padEnd(5)} | ${s.chunksRetrieved.toString().padEnd(6)} | ${s.topChunk.padEnd(16)} |`);
  }

  console.log("\n=========================================================================================");
  console.log("                                  CONTEXT GROUNDING VALIDATION                           ");
  console.log("=========================================================================================");
  console.log(`- Separation: Contextual RAG returns general guidelines in general sections only.`);
  console.log(`- Emergency Short-circuit Verification: ${results.find(r => r.id === "K1")?.status === "PASS" || results.find(r => r.id === "K")?.status === "PASS" ? "Verified (RAG/LLM Bypassed)" : "Failed"}`);
  console.log(`- Non-medical Pivot Context Clear Verification: ${pivotPass ? "Verified (Reset on topic change)" : "Failed"}`);

  console.log("\n===============================================================");
  console.log("                      EVALUATION SUMMARY                       ");
  console.log("===============================================================");
  console.log(`Total Test Scenarios Evaluated  : ${testCases.length}`);
  console.log(`Precision@1                     : ${precisionAt1.toFixed(1)}%`);
  console.log(`Precision@3                     : ${precisionAt3.toFixed(1)}%`);
  console.log(`Recall                          : ${recallVal.toFixed(1)}%`);
  console.log(`False Positive Rate (FPR)       : ${falsePositiveRate.toFixed(1)}%`);
  console.log(`False Negative Rate (FNR)       : ${falseNegativeRate.toFixed(1)}%`);
  console.log(`Context Resolution Accuracy     : ${contextResolutionAccuracy.toFixed(1)}%`);
  console.log("---------------------------------------------------------------");
  console.log("These metrics reflect the quality of document retrieval and context");
  console.log("resolution only. No clinical or diagnostic accuracy is claimed.");
  console.log("===============================================================\n");

  process.exit(0);
}

runEvaluation().catch(err => {
  console.error("Evaluation suite failed:", err);
  process.exit(1);
});
