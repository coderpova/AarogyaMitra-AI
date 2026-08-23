import jwt from "jsonwebtoken";

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || "aarogyamitra_default_jwt_secret_key_2026";
}

export function signJwt(payload: object, expiresIn: string = "7d"): string {
  const secret = getJwtSecret();
  return (jwt as any).sign(payload, secret, { expiresIn });
}

export function verifyJwt(token: string): { userId: string; email?: string } | null {
  if (!token) return null;
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as any;
    if (decoded && (decoded.userId || decoded.id)) {
      return { userId: decoded.userId || decoded.id, email: decoded.email };
    }
    return null;
  } catch (err) {
    return null;
  }
}

export function getAuthUserId(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  let token = authHeader ? (authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader) : null;

  if (!token) {
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/(?:^|;)\s*token\s*=\s*([^;]+)/);
    token = match ? match[1] : null;
  }

  if (!token) return null;

  const result = verifyJwt(token);
  return result ? result.userId : null;
}
