// frontend/lib/embed.ts
import { pipeline } from "@xenova/transformers";

let embedPipeline: any = null;
let embeddingDim: number | null = null;

/**
 * Lazy‑load the embedding pipeline based on the model name in RAG_EMBEDDING_MODEL.
 * The default model is a multilingual MiniLM that supports English and Hindi.
 */
async function loadPipeline() {
  if (embedPipeline) return;
  const modelName = process.env.RAG_EMBEDDING_MODEL || "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
  try {
    embedPipeline = await pipeline("feature-extraction", modelName);
    // Perform a short test to infer the vector dimension.
    const testVec = await embedPipeline("test", { pooling: "mean", normalize: true });
    if (testVec && testVec.data) {
      embeddingDim = testVec.data.length;
    } else if (testVec && testVec.dims && testVec.dims.length > 1) {
      embeddingDim = testVec.dims[testVec.dims.length - 1];
    }
    console.log(`[RAG] Embedding model loaded (${modelName}), dimension = ${embeddingDim}`);
  } catch (e) {
    console.warn("[RAG] Failed to load embedding model", e);
    embedPipeline = null;
    embeddingDim = null;
  }
}

const EMBEDDING_CACHE = new Map<string, number[]>();
const MAX_EMBED_CACHE_SIZE = 500;

export function clearEmbeddingCache(): void {
  EMBEDDING_CACHE.clear();
}

export function getEmbeddingCacheSize(): number {
  return EMBEDDING_CACHE.size;
}

/**
 * Returns a dense vector for the supplied text, or null if generation fails.
 * Uses bounded deterministic caching to eliminate redundant CPU forward-pass latency.
 * Errors are caught and logged – the chat flow never crashes because of this.
 */
export async function embed(text: string): Promise<number[] | null> {
  if (!text || typeof text !== "string") return null;
  const cleanKey = text.trim().toLowerCase();

  // Fast cache hit
  if (EMBEDDING_CACHE.has(cleanKey)) {
    return EMBEDDING_CACHE.get(cleanKey)!;
  }

  try {
    await loadPipeline();
    if (!embedPipeline) return null;
    const output = await embedPipeline(text, { pooling: "mean", normalize: true });
    if (output && output.data) {
      const vec = Array.from(output.data) as number[];
      // Evict oldest entry if at capacity
      if (EMBEDDING_CACHE.size >= MAX_EMBED_CACHE_SIZE) {
        const firstKey = EMBEDDING_CACHE.keys().next().value;
        if (firstKey) EMBEDDING_CACHE.delete(firstKey);
      }
      EMBEDDING_CACHE.set(cleanKey, vec);
      return vec;
    }
    return null;
  } catch (e) {
    console.warn("[RAG] Embedding generation error", e);
    return null;
  }
}

/**
 * Returns the dimensionality of the model's output vectors after the model has been loaded.
 */
export function getEmbeddingDimension(): number | null {
  return embeddingDim;
}
