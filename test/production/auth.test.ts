import { describe, it, expect, beforeEach } from "@jest/globals";
import { signJwt, verifyJwt, getAuthUserId, getJwtSecret } from "@/lib/jwtHelper";
import jwt from "jsonwebtoken";

describe("Authentication & Authorization Test Suite", () => {
  const testUserId = "user_123456789";
  const testEmail = "patient.test@aarogya.gov.in";

  beforeEach(() => {
    process.env.JWT_SECRET = "test_super_secret_jwt_key_aarogya_2026";
  });

  describe("signJwt & verifyJwt", () => {
    it("signs a token and verifies payload successfully", () => {
      const token = signJwt({ userId: testUserId, email: testEmail });
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(20);

      const decoded = verifyJwt(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(testUserId);
      expect(decoded?.email).toBe(testEmail);
    });

    it("supports legacy id field in payload", () => {
      const secret = getJwtSecret();
      const legacyToken = (jwt as any).sign({ id: "legacy_user_777" }, secret);
      const decoded = verifyJwt(legacyToken);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe("legacy_user_777");
    });

    it("returns null for completely invalid or corrupted token string", () => {
      expect(verifyJwt("not-a-valid-token")).toBeNull();
      expect(verifyJwt("")).toBeNull();
      expect(verifyJwt(null as any)).toBeNull();
      expect(verifyJwt("header.payload.invalidsignature")).toBeNull();
    });

    it("returns null when token was signed with a different secret", () => {
      const forgedToken = (jwt as any).sign({ userId: testUserId }, "attacker_different_secret");
      expect(verifyJwt(forgedToken)).toBeNull();
    });

    it("returns null for an expired token", () => {
      const secret = getJwtSecret();
      const expiredToken = (jwt as any).sign({ userId: testUserId }, secret, { expiresIn: "0s" });
      expect(verifyJwt(expiredToken)).toBeNull();
    });
  });

  describe("getAuthUserId", () => {
    it("extracts userId from Bearer Authorization header", () => {
      const token = signJwt({ userId: "bearer_user_01" });
      const req = new Request("http://localhost:3000/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const extractedId = getAuthUserId(req);
      expect(extractedId).toBe("bearer_user_01");
    });

    it("extracts userId from raw token without Bearer prefix in Authorization header", () => {
      const token = signJwt({ userId: "raw_header_user_02" });
      const req = new Request("http://localhost:3000/api/profile", {
        headers: { Authorization: token },
      });

      const extractedId = getAuthUserId(req);
      expect(extractedId).toBe("raw_header_user_02");
    });

    it("extracts userId from token cookie when Authorization header is absent", () => {
      const token = signJwt({ userId: "cookie_user_03" });
      const req = new Request("http://localhost:3000/api/profile", {
        headers: { Cookie: `theme=light; token=${token}; lang=en` },
      });

      const extractedId = getAuthUserId(req);
      expect(extractedId).toBe("cookie_user_03");
    });

    it("prioritizes Authorization header over cookie", () => {
      const headerToken = signJwt({ userId: "header_priority_user" });
      const cookieToken = signJwt({ userId: "cookie_secondary_user" });

      const req = new Request("http://localhost:3000/api/profile", {
        headers: {
          Authorization: `Bearer ${headerToken}`,
          Cookie: `token=${cookieToken}`,
        },
      });

      const extractedId = getAuthUserId(req);
      expect(extractedId).toBe("header_priority_user");
    });

    it("returns null when neither Authorization header nor token cookie is present", () => {
      const req = new Request("http://localhost:3000/api/profile", {
        headers: { Cookie: "theme=dark" },
      });

      expect(getAuthUserId(req)).toBeNull();
    });

    it("returns null when token in header is malformed or invalid", () => {
      const req = new Request("http://localhost:3000/api/profile", {
        headers: { Authorization: "Bearer bogus.jwt.token" },
      });

      expect(getAuthUserId(req)).toBeNull();
    });
  });
});
