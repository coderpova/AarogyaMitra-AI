// frontend/lib/jwtHelper.ts
// Helper to sign and verify JWTs with safe redaction
import jwt from "jsonwebtoken";
import logger from "./logger";

const JWT_SECRET = process.env.JWT_SECRET as string;

export function signJwt(payload: object, expiresIn: string = "7d"): string {
  if (!JWT_SECRET) {
    logger.error("JWT secret missing when signing token");
    throw new Error("Server configuration error");
  }
  return (jwt as any).sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyJwt(token: string): { userId: string; email: string } | null {
  if (!JWT_SECRET) {
    logger.error("JWT secret missing when verifying token");
    return null;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return { userId: decoded.userId, email: decoded.email };
  } catch (err) {
    logger.warn("JWT verification failed", { token: "[REDACTED]" });
    return null;
  }
}
