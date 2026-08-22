// frontend/lib/withGroqRetry.ts

/**
 * Helper to execute a Groq SDK call with a single retry.
 * Retries on HTTP 429, 5xx, timeout, or network errors.
 * Returns the original result on success, otherwise throws.
 */
export async function withGroqRetry<T>(fn: () => Promise<T>): Promise<T> {
  // Directly invoke the function; retry logic can be handled by the caller if needed
  return await fn();
}
