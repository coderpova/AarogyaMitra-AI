// frontend/lib/sanitize.ts
// Sanitization utilities for untrusted data (RAG docs, reports, health context)

/**
 * Strip disallowed action tags from a string. Only allow [BOOK_APPOINTMENT] and [FIND_HOSPITAL].
 */
export function stripDisallowedActionTags(input: string): string {
  return input.replace(/\[(?!BOOK_APPOINTMENT|FIND_HOSPITAL\])[A-Z_]+\]/g, "");
}

/**
 * Sanitize RAG document text – remove any embedded action tags.
 */
export function sanitizeRagDoc(text: string): string {
  return stripDisallowedActionTags(text);
}

/**
 * Sanitize uploaded report text – similar handling.
 */
export function sanitizeReportText(text: string): string {
  return stripDisallowedActionTags(text);
}

/**
 * Sanitize personal health context – ensure no action tags leak.
 */
export function sanitizeHealthContext(text: string): string {
  return stripDisallowedActionTags(text);
}
