import { describe, it, expect } from "@jest/globals";
import { calculateBmi, calculateDailyHealthScore } from "@/lib/dailyHealth";
import { t } from "@/lib/i18n";
import { stripDisallowedActionTags, sanitizeRagDoc, sanitizeReportText, sanitizeHealthContext } from "@/lib/sanitize";
import { rateLimit } from "@/lib/rateLimiter";
import { validatePayloadSize, enforceRequestSize } from "@/lib/requestSizeValidator";
import { ApiError, handleApiError } from "@/lib/apiError";
import { normalizeState, checkBasicEligibility, UserProfile, Scheme } from "@/lib/schemeMatcher";
import { extractSymptoms } from "@/lib/symptomExtractor";

describe("Utility Functions Test Suite", () => {
  describe("dailyHealth", () => {
    it("calculates normal BMI correctly", () => {
      const bmi = calculateBmi(70, 175);
      expect(bmi).toBe(22.9);
    });

    it("handles null or missing height and weight gracefully", () => {
      expect(calculateBmi(null, 175)).toBeNull();
      expect(calculateBmi(70, null)).toBeNull();
      expect(calculateBmi(undefined, undefined)).toBeNull();
      expect(calculateBmi(0, 175)).toBeNull();
    });

    it("calculates comprehensive daily health score based on metrics", () => {
      const optimalScore = calculateDailyHealthScore({
        steps: 8000,
        waterIntakeMl: 2000,
        sleepHours: 8,
        heartRate: 70,
        bloodPressure: { systolic: 115, diastolic: 75 },
        stressLevel: 1,
        mood: "great",
      });
      expect(optimalScore).toBe(100);

      const moderateScore = calculateDailyHealthScore({
        steps: 4000,
        waterIntakeMl: 1000,
        sleepHours: 6,
        heartRate: 110,
        bloodPressure: { systolic: 140, diastolic: 95 },
        stressLevel: 8,
        mood: "poor",
      });
      expect(moderateScore).toBeLessThan(70);
    });

    it("returns 0 score when no metric inputs are provided", () => {
      expect(calculateDailyHealthScore({})).toBe(0);
    });
  });

  describe("i18n", () => {
    it("translates existing keys for English", () => {
      const text = t("en", "common.error");
      expect(typeof text).toBe("string");
      expect(text.length).toBeGreaterThan(0);
    });

    it("translates existing keys for Hindi", () => {
      const text = t("hi", "common.required");
      expect(typeof text).toBe("string");
      expect(text.length).toBeGreaterThan(0);
    });

    it("falls back to default English when key is missing in target language", () => {
      const text = t("non_existent_lang", "common.error");
      expect(typeof text).toBe("string");
      expect(text.length).toBeGreaterThan(0);
    });

    it("returns last segment when key does not exist anywhere", () => {
      const text = t("en", "non.existent.fallbackKey");
      expect(text).toBe("fallbackKey");
    });

    it("interpolates parameters inside template strings", () => {
      const text = t("en", "dashboard.welcome", { name: "Aarav" });
      expect(text).toBeDefined();
    });
  });

  describe("sanitize", () => {
    it("preserves allowed action tags [BOOK_APPOINTMENT] and [FIND_HOSPITAL]", () => {
      const input = "Please [BOOK_APPOINTMENT] or [FIND_HOSPITAL] for care.";
      expect(stripDisallowedActionTags(input)).toBe(input);
    });

    it("strips disallowed or malicious action tags", () => {
      const input = "System alert [DROP_DATABASE] [EXEC_CODE] [ROOT_ACCESS]";
      const sanitized = stripDisallowedActionTags(input);
      expect(sanitized).not.toContain("[DROP_DATABASE]");
      expect(sanitized).not.toContain("[EXEC_CODE]");
      expect(sanitized).not.toContain("[ROOT_ACCESS]");
    });

    it("sanitizes RAG doc, report text, and health context cleanly", () => {
      const malicious = "Report details [MALICIOUS_TAG] all normal.";
      expect(sanitizeRagDoc(malicious)).not.toContain("[MALICIOUS_TAG]");
      expect(sanitizeReportText(malicious)).not.toContain("[MALICIOUS_TAG]");
      expect(sanitizeHealthContext(malicious)).not.toContain("[MALICIOUS_TAG]");
    });
  });

  describe("rateLimiter", () => {
    it("allows requests within point limit", () => {
      const id = "test_user_" + Math.random().toString(36);
      const res1 = rateLimit("login", id, { points: 2, duration: 60 });
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(1);

      const res2 = rateLimit("login", id, { points: 2, duration: 60 });
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(0);

      const res3 = rateLimit("login", id, { points: 2, duration: 60 });
      expect(res3.allowed).toBe(false);
      expect(res3.remaining).toBe(0);
    });

    it("returns allowed true for unknown unconfigured routes", () => {
      const res = rateLimit("unconfigured_route_xyz", "some_id");
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(Infinity);
    });
  });

  describe("requestSizeValidator", () => {
    it("validates Content-Length header against maxBytes", () => {
      expect(validatePayloadSize("1024", 2048)).toBe(true);
      expect(validatePayloadSize("5000", 2048)).toBe(false);
      expect(validatePayloadSize(null, 2048)).toBe(true);
      expect(validatePayloadSize("invalid-nan", 2048)).toBe(false);
    });

    it("enforces request size and returns 413 Response when exceeded", async () => {
      const largeBody = "x".repeat(3000);
      const req = new Request("http://localhost:3000/api/test", {
        method: "POST",
        headers: { "Content-Length": "3000" },
        body: largeBody,
      });

      const response = await enforceRequestSize(req, 1000);
      expect(response).not.toBeNull();
      expect(response?.status).toBe(413);

      const data = await response!.json();
      expect(data.error).toBe("PAYLOAD_TOO_LARGE");
    });

    it("returns null when request size is within limit", async () => {
      const smallBody = JSON.stringify({ message: "Hello" });
      const req = new Request("http://localhost:3000/api/test", {
        method: "POST",
        headers: { "Content-Length": String(smallBody.length) },
        body: smallBody,
      });

      const response = await enforceRequestSize(req, 10000);
      expect(response).toBeNull();
    });
  });

  describe("apiError", () => {
    it("creates an ApiError with custom status and code", () => {
      const err = new ApiError(404, "NOT_FOUND", "Resource missing");
      expect(err.status).toBe(404);
      expect(err.code).toBe("NOT_FOUND");
      expect(err.message).toBe("Resource missing");
      expect(err.name).toBe("ApiError");
    });

    it("formats ApiError into structured HTTP response object", () => {
      const err = new ApiError(400, "BAD_REQUEST", "Invalid input parameters");
      const result = handleApiError(err);
      expect(result.status).toBe(400);
      expect(result.body.error).toBe("BAD_REQUEST");
      expect(result.body.message).toBe("Invalid input parameters");
    });

    it("handles generic unexpected error without exposing stack traces", () => {
      const unexpected = new Error("Database connection crashed");
      const result = handleApiError(unexpected);
      expect(result.status).toBe(500);
      expect(result.body.error).toBe("INTERNAL_SERVER_ERROR");
      expect(result.body.message).toBe("Internal Server Error");
    });
  });

  describe("schemeMatcher", () => {
    it("normalizes common Indian state abbreviations", () => {
      expect(normalizeState("UP")).toBe("Uttar Pradesh");
      expect(normalizeState("u.p.")).toBe("Uttar Pradesh");
      expect(normalizeState("mh")).toBe("Maharashtra");
      expect(normalizeState("dl")).toBe("Delhi");
      expect(normalizeState("Kerala")).toBe("Kerala");
      expect(normalizeState("")).toBe("");
    });

    it("verifies basic scheme eligibility rules correctly", () => {
      const user: UserProfile = {
        age: 28,
        gender: "female",
        state: "Delhi",
        income: 200000,
        category: "General",
        pregnant: true,
        seniorCitizen: false,
        disability: false,
      };

      const eligibleScheme: Scheme = {
        name: "Maternal Health Scheme",
        description: "Assistance for pregnant women",
        benefit: "Cash support",
        eligibility: {
          minAge: 18,
          maxAge: 45,
          gender: "female",
          pregnant: true,
          maxIncome: 500000,
        },
      };

      expect(checkBasicEligibility(user, eligibleScheme)).toBe(true);

      const seniorScheme: Scheme = {
        name: "Senior Citizen Pension",
        description: "Support for elders",
        benefit: "Monthly pension",
        eligibility: {
          minAge: 60,
          seniorCitizen: true,
        },
      };

      expect(checkBasicEligibility(user, seniorScheme)).toBe(false);
    });
  });

  describe("symptomExtractor", () => {
    it("detects symptoms from user input text", () => {
      const result = extractSymptoms("I have severe cough and high fever since yesterday");
      expect(Array.isArray(result.symptoms)).toBe(true);
      const symptomNames = result.symptoms.map((s: { name: string }) => s.name.toLowerCase());
      expect(symptomNames.some((n: string) => n.includes("cough") || n.includes("fever"))).toBe(true);
    });

    it("flags emergency symptoms when present", () => {
      const result = extractSymptoms("I am having sudden chest pain and breathing issues");
      const hasEmergency = result.symptoms.some((s: { emergency: boolean }) => s.emergency === true);
      expect(hasEmergency).toBe(true);
    });

    it("returns empty symptoms array for non-symptom queries", () => {
      const result = extractSymptoms("What is the capital of India?");
      expect(result.symptoms.length).toBe(0);
    });

    it("extracts duration and temperature from text", () => {
      const result = extractSymptoms("Fever for 3 days and temperature 102");
      expect(result.duration).toContain("3 day");
      expect(result.temperature).toBe(102);
    });
  });
});
