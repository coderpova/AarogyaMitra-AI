// frontend/lib/apiHandler.ts

import { NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwtHelper";
import { rateLimit, withRateLimit } from "@/lib/rateLimiter";
import { enforceRequestSize } from "@/lib/requestSizeValidator";
import logger from "@/lib/logger";
import { metrics } from "@/lib/metrics";
import { ApiError, handleApiError } from "@/lib/apiError";
import { withMongoRetry } from "@/lib/withMongoRetry";
import { withGroqRetry } from "@/lib/withGroqRetry";
import { randomUUID } from "crypto";

/**
 * Generic API handler wrapper that enforces:
 *  - JWT authentication (for protected routes)
 *  - Rate limiting (per route)
 *  - Request size validation
 *  - Structured logging and metrics
 *  - Centralized error handling
 *  - Optional MongoDB / Groq retry helpers can be used inside core logic
 */
export async function handleApi({
  request,
  route,
  identifierFn, // (req) => string used for rate limiting (userId or IP)
  requireAuth = true,
  maxPayloadBytes,
  coreHandler,
}: {
  request: Request;
  route: string;
  identifierFn: (req: Request) => string;
  requireAuth?: boolean;
  maxPayloadBytes?: number;
  coreHandler: (payload: any, userId: string | null, requestId: string) => Promise<Response>;
}): Promise<Response> {
  const requestId = randomUUID();
  const start = Date.now();
  const loggerMeta = { requestId, route };
  logger.info(`Incoming request`, { ...loggerMeta, method: request.method, url: request.url });

  // Rate limit check
  const rateKey = identifierFn(request);
  const rlResult = rateLimit(route, rateKey);
  if (!rlResult.allowed) {
    metrics.increment("rateLimitHits");
    logger.warn(`Rate limit exceeded`, { ...loggerMeta, route, identifier: rateKey });
    return new Response(
      JSON.stringify({ error: "TOO_MANY_REQUESTS", message: "Rate limit exceeded" }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // Payload size validation
  if (maxPayloadBytes) {
    const sizeOk = enforceRequestSize(request, maxPayloadBytes);
    if (!sizeOk) {
      logger.warn(`Payload too large`, { ...loggerMeta, route, size: maxPayloadBytes });
      return new Response(
        JSON.stringify({ error: "PAYLOAD_TOO_LARGE", message: "Request payload is too large." }),
        { status: 413, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Authentication
  let userId: string | null = null;
  if (requireAuth) {
    const authHeader = request.headers.get("authorization");
    let token = authHeader ? authHeader.split(" ")[1] : null;
    if (!token) {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(/(?:^|;)\s*token\s*=\s*([^;]+)/);
      token = match ? match[1] : null;
    }
    if (!token) {
      logger.warn(`Missing token`, { ...loggerMeta, route });
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED", message: "Missing authentication token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    try {
      const decoded = verifyJwt(token);
      if (!decoded) {
        logger.warn(`JWT verification failed`, { ...loggerMeta });
        return new Response(
          JSON.stringify({ error: "UNAUTHORIZED", message: "Invalid authentication token" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
      userId = decoded.userId;
    } catch (err: any) {
      logger.warn(`JWT verification failed`, { ...loggerMeta, error: err.message });
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED", message: "Invalid authentication token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Parse JSON payload (if any)
  let payload = null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      payload = await request.clone().json();
    } catch (e) {
      // ignore; coreHandler can handle missing payload
    }
  }

  try {
    const response = await coreHandler(payload, userId, requestId);
    const latency = Date.now() - start;
    logger.info(`Request completed`, { ...loggerMeta, status: response.status, latency });
    metrics.increment(`${route}Requests`);
    return response;
  } catch (err: any) {
    const apiErr = err instanceof ApiError ? err : new ApiError(500, "INTERNAL_ERROR", "An unexpected error occurred");
    logger.error(`Error handling request`, { ...loggerMeta, error: err.message, stack: err.stack });
    const { status, body } = handleApiError(apiErr);
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  }
}

// Helper to create identifier for authenticated routes (userId) or unauthenticated (IP)
export function getAuthIdentifier(req: Request, userId: string | null): string {
  if (userId) return userId;
  // fallback to IP for login/unauth routes
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || (req as any).socket?.remoteAddress || "unknown";
}
