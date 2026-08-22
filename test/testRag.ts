import { isMedicalQuery, retrieveKnowledge, seedMedicalKnowledge } from "../lib/ragService";
import connectDB from "../lib/mongodb";

async function runTests() {
  console.log("=== STARTING MEDICAL RAG MVP TESTS ===");
  
  await connectDB();
  
  console.log("\n--- Seeding Medical Knowledge Base ---");
  const seededCount = await seedMedicalKnowledge();
  console.log(`Successfully seeded ${seededCount} documents.`);

  const testCases = [
    {
      name: "Relevant Medical Query 1",
      query: "how to manage fever at home?",
      expectMedical: true
    },
    {
      name: "Relevant Medical Query 2 (Dehydration)",
      query: "what should I do for dehydration recovery?",
      expectMedical: true
    },
    {
      name: "Irrelevant General Query",
      query: "What is the capital of India?",
      expectMedical: false
    },
    {
      name: "No-Result Medical Query (gibberish/no matches)",
      query: "symptomsof xyzrandomdisease12345",
      expectMedical: true
    },
    {
      name: "Hindi Medical Query",
      query: "बुखार का इलाज क्या है और पेरासिटामोल कब लें?",
      expectMedical: true
    },
    {
      name: "Hinglish Medical Query",
      query: "dehydration hone par kya kare?",
      expectMedical: true
    }
  ];

  for (const tc of testCases) {
    console.log(`\n==================================================`);
    console.log(`TEST CASE: ${tc.name}`);
    console.log(`Query: "${tc.query}"`);
    
    const isMed = isMedicalQuery(tc.query);
    console.log(`Is Medical Query (detected): ${isMed} (Expected: ${tc.expectMedical})`);
    
    if (isMed) {
      console.log("Retrieving matching knowledge chunks...");
      const chunks = await retrieveKnowledge(tc.query, 3);
      console.log(`Retrieved chunks count: ${chunks.length}`);
      
      if (chunks.length > 0) {
        chunks.forEach((chunk, index) => {
          console.log(`\n  Chunk #${index + 1}: [Source: ${chunk.source}] Title: "${chunk.title}"`);
          console.log(`  Content snippet: "${chunk.content.substring(0, 150)}..."`);
          console.log(`  Tags: ${JSON.stringify(chunk.tags)}`);
        });
      } else {
        console.log("  No matching chunks found in the database. (Fallback triggered successfully)");
      }
    } else {
      console.log("Skipping retrieval as query was classified as non-medical.");
    }
  }
  
  console.log(`\n==================================================`);
  console.log("=== TESTS COMPLETED ===");
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
