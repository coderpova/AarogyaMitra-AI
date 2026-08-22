export interface RagLogMetadata {
  requestId: string;
  timestamp: string;
  language: string;
  retrievalMode: "vector" | "keyword" | "fallback" | "bypass";
  chunkCount: number;
  topScore?: number;
  latencyMs: number;
  fallbackUsed: boolean;
  evidenceLevel?: string;
  isEmergency: boolean;
}

/**
 * Structured RAG observability logger.
 * Captures non-sensitive telemetry without logging personal patient identifiers or raw private health records.
 */
export function logRagTelemetry(metadata: RagLogMetadata): void {
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    console.log(`[RAG-Telemetry] Request:${metadata.requestId} Mode:${metadata.retrievalMode} Chunks:${metadata.chunkCount} Latency:${metadata.latencyMs}ms Fallback:${metadata.fallbackUsed} Emergency:${metadata.isEmergency}`);
  }
}
