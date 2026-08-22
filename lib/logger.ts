// Simple logger with redaction of sensitive fields, no external dependencies.

type LogLevel = "debug" | "info" | "warn" | "error";

const SENSITIVE_FIELDS = [
  "jwt",
  "token",
  "password",
  "jwt_secret",
  "JWT_SECRET",
  "apiKey",
  "api_key",
  "accessToken",
  "Authorization",
  "email",
  "userId",
  // Add any additional fields that may contain sensitive data
];

function redact(obj: any): any {
  if (obj && typeof obj === "object") {
    const clone: any = Array.isArray(obj) ? [] : {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_FIELDS.includes(key)) {
        clone[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        clone[key] = redact(value);
      } else {
        clone[key] = value;
      }
    }
    return clone;
  }
  return obj;
}

function log(level: LogLevel, message: string, meta?: any) {
  const timestamp = new Date().toISOString();
  const payload = meta ? redact(meta) : undefined;
  const entry = { timestamp, level, message, ...(payload || {}) };
  console.log(JSON.stringify(entry));
}

const logger = {
  debug: (msg: string, meta?: any) => log("debug", msg, meta),
  info: (msg: string, meta?: any) => log("info", msg, meta),
  warn: (msg: string, meta?: any) => log("warn", msg, meta),
  error: (msg: string, meta?: any) => log("error", msg, meta),
};

export default logger;
