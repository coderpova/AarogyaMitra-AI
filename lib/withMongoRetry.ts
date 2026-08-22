// frontend/lib/withMongoRetry.ts

/**
 * Helper to execute a MongoDB operation with bounded retries.
 * Uses exponential backoff: 200ms base, max 800ms.
 * Maximum attempts: 2 (initial + one retry).
 */
export async function withMongoRetry<T>(fn: () => Promise<T>): Promise<T> {
  const maxAttempts = 2;
  const baseDelay = 200; // ms
  const maxDelay = 800; // ms

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) {
        throw err; // propagate after final attempt
      }
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  // Should never reach here
  throw new Error('Mongo retry exhausted');
}
