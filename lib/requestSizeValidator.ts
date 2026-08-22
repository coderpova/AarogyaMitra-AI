// frontend/lib/requestSizeValidator.ts
// Utility to enforce payload size limits for API routes.

export function validatePayloadSize(
  contentLengthHeader: string | null,
  maxBytes: number,
): boolean {
  if (!contentLengthHeader) return true; // No header – let route handle actual size later.
  const size = parseInt(contentLengthHeader, 10);
  return !Number.isNaN(size) && size <= maxBytes;
}

export async function enforceRequestSize(
  request: Request,
  maxBytes: number,
): Promise<Response | null> {
  const contentLength = request.headers.get("content-length");
  if (!validatePayloadSize(contentLength, maxBytes)) {
    return new Response(
      JSON.stringify({ error: "PAYLOAD_TOO_LARGE", message: "Payload exceeds allowed size" }),
      { status: 413, headers: { "Content-Type": "application/json" } },
    );
  }
  // For safety, also check actual body size for non-GET requests
  if (request.body) {
    const clone = request.clone();
    const body = await clone.text();
    const encoder = new TextEncoder();
    const bytes = encoder.encode(body).length;
    if (bytes > maxBytes) {
      return new Response(
        JSON.stringify({ error: "PAYLOAD_TOO_LARGE", message: "Payload exceeds allowed size" }),
        { status: 413, headers: { "Content-Type": "application/json" } },
      );
    }
  }
  return null;
}
