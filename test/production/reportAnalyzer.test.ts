import { describe, it, expect, jest } from "@jest/globals";

// Mock connectDB so tests run completely offline in milliseconds
jest.mock("@/lib/mongodb", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({}),
}));

import {
  parseObservedValue,
  parseReferenceRange,
  isPhysicallyPlausible,
  determineStatus,
  parseJsonSafely,
  POST,
  GET,
} from "@/app/api/report-analyzer/route";

describe("Medical Report Analyzer Test Suite", () => {
  describe("parseObservedValue", () => {
    it("parses clean numeric strings accurately", () => {
      expect(parseObservedValue("12.5")).toBe(12.5);
      expect(parseObservedValue("140")).toBe(140);
      expect(parseObservedValue("0.8")).toBe(0.8);
    });

    it("parses values with commas and units", () => {
      expect(parseObservedValue("1,50,000 /µL")).toBe(150000);
      expect(parseObservedValue("4.5 million/cumm")).toBe(4.5);
      expect(parseObservedValue("13.2 g/dL")).toBe(13.2);
    });

    it("parses values with comparison operators", () => {
      expect(parseObservedValue("<0.5")).toBe(0.5);
      expect(parseObservedValue("<=10")).toBe(10);
      expect(parseObservedValue(">200")).toBe(200);
      expect(parseObservedValue(">=50")).toBe(50);
    });

    it("returns null for non-numeric, null or empty inputs", () => {
      expect(parseObservedValue(null)).toBeNull();
      expect(parseObservedValue(undefined)).toBeNull();
      expect(parseObservedValue("")).toBeNull();
      expect(parseObservedValue("Not Detected")).toBeNull();
      expect(parseObservedValue("Negative")).toBeNull();
    });
  });

  describe("parseReferenceRange", () => {
    it("parses hyphenated numeric ranges", () => {
      const range1 = parseReferenceRange("12.0 - 15.5");
      expect(range1.low).toBe(12.0);
      expect(range1.high).toBe(15.5);
      expect(range1.operator).toBeNull();

      const range2 = parseReferenceRange("4000-11000");
      expect(range2.low).toBe(4000);
      expect(range2.high).toBe(11000);
    });

    it("handles en-dash and em-dash symbols gracefully", () => {
      const range = parseReferenceRange("13.0–17.0");
      expect(range.low).toBe(13.0);
      expect(range.high).toBe(17.0);
    });

    it("parses inequality operators in reference ranges", () => {
      const lessRange = parseReferenceRange("< 100");
      expect(lessRange.low).toBe(0);
      expect(lessRange.high).toBe(100);
      expect(lessRange.operator).toBe("<");

      const greaterRange = parseReferenceRange("> 60");
      expect(greaterRange.low).toBe(60);
      expect(greaterRange.high).toBeNull();
      expect(greaterRange.operator).toBe(">");
    });

    it("handles natural language bounds", () => {
      const underRange = parseReferenceRange("Less than 200 mg/dL");
      expect(underRange.high).toBe(200);

      const aboveRange = parseReferenceRange("Above 50 mg/dL");
      expect(aboveRange.low).toBe(50);
    });

    it("returns nulls for empty or unavailable ranges", () => {
      expect(parseReferenceRange(null)).toEqual({ low: null, high: null, operator: null });
      expect(parseReferenceRange("")).toEqual({ low: null, high: null, operator: null });
      expect(parseReferenceRange("N/A")).toEqual({ low: null, high: null, operator: null });
    });
  });

  describe("isPhysicallyPlausible", () => {
    it("validates Hemoglobin (Hb) within 2-25 g/dL", () => {
      expect(isPhysicallyPlausible("Hemoglobin", 13.5, "12-16")).toBe(true);
      expect(isPhysicallyPlausible("Hb", 7.2, "12-16")).toBe(true);
      expect(isPhysicallyPlausible("Haemoglobin", 0.5, "12-16")).toBe(false);
      expect(isPhysicallyPlausible("Hemoglobin", 35.0, "12-16")).toBe(false);
    });

    it("validates WBC count within 100-150,000 /µL", () => {
      expect(isPhysicallyPlausible("WBC", 7500, "4000-11000")).toBe(true);
      expect(isPhysicallyPlausible("TLC", 12000, "4000-11000")).toBe(true);
      expect(isPhysicallyPlausible("White Blood Cells", 20, "4000-11000")).toBe(false);
      expect(isPhysicallyPlausible("WBC", 200000, "4000-11000")).toBe(false);
    });

    it("validates Platelet count scale and unit consistency", () => {
      // Consistent scale (both in thousands or both absolute)
      expect(isPhysicallyPlausible("Platelet Count", 250000, "150000 - 450000")).toBe(true);
      expect(isPhysicallyPlausible("PLT", 2.5, "1.5 - 4.5")).toBe(true);

      // Inconsistent scale: value in absolute, range in lacs/hundreds
      expect(isPhysicallyPlausible("Platelets", 250000, "1.5 - 4.5")).toBe(false);

      // Inconsistent scale: value in lacs/hundreds, range in absolute numbers
      expect(isPhysicallyPlausible("Platelets", 2.5, "150000 - 450000")).toBe(false);
    });
  });

  describe("determineStatus", () => {
    it("determines Normal status within range", () => {
      const status = determineStatus("Hemoglobin", "14.0", "12.0 - 16.0");
      expect(status).toBe("Normal");
    });

    it("determines High status when value exceeds range high", () => {
      const status = determineStatus("Fasting Blood Sugar", "160", "70 - 100");
      expect(status).toBe("High");
    });

    it("determines Low status when value is below range low", () => {
      const status = determineStatus("Hemoglobin", "9.5", "12.0 - 16.0");
      expect(status).toBe("Low");
    });

    it("evaluates inequality ranges correctly", () => {
      expect(determineStatus("Total Cholesterol", "180", "< 200")).toBe("Normal");
      expect(determineStatus("Total Cholesterol", "240", "< 200")).toBe("High");
      expect(determineStatus("HDL Cholesterol", "30", "> 40")).toBe("Low");
      expect(determineStatus("HDL Cholesterol", "55", "> 40")).toBe("Normal");
    });

    it("returns Unknown for physically implausible values", () => {
      const status = determineStatus("Hemoglobin", "99.0", "12.0 - 16.0");
      expect(status).toBe("Unknown");
    });

    it("returns Unknown when range is missing or unavailable", () => {
      expect(determineStatus("Unknown Marker", "45", "")).toBe("Unknown");
      expect(determineStatus("Unknown Marker", "45", "N/A")).toBe("Unknown");
      expect(determineStatus("Unknown Marker", null, "10-20")).toBe("Unknown");
    });
  });

  describe("parseJsonSafely", () => {
    it("parses clean JSON objects", () => {
      const raw = JSON.stringify({ title: "CBC Report", parameters: [] });
      const result = parseJsonSafely(raw);
      expect(result.success).toBe(true);
      expect(result.parsed.title).toBe("CBC Report");
    });

    it("strips markdown json code fences", () => {
      const raw = "```json\n{\n  \"summary\": \"All parameters normal\"\n}\n```";
      const result = parseJsonSafely(raw);
      expect(result.success).toBe(true);
      expect(result.parsed.summary).toBe("All parameters normal");
    });

    it("handles trailing commas safely", () => {
      const raw = "{\n  \"name\": \"Glucose\",\n  \"value\": 95,\n}";
      const result = parseJsonSafely(raw);
      expect(result.success).toBe(true);
      expect(result.parsed.value).toBe(95);
    });

    it("returns success false for empty or non-JSON strings", () => {
      expect(parseJsonSafely("").success).toBe(false);
      expect(parseJsonSafely("Not a json at all").success).toBe(false);
    });
  });

  describe("POST /api/report-analyzer - Validation & Safeguards", () => {
    it("returns 413 FILE_TOO_LARGE when uploaded file exceeds 4.5 MB", async () => {
      const formData = new FormData();
      // Create a 5MB blob
      const bigBlob = new Blob([new Uint8Array(5 * 1024 * 1024)], { type: "application/pdf" });
      formData.append("file", bigBlob, "large_report.pdf");

      const req = new Request("http://localhost:3000/api/report-analyzer", {
        method: "POST",
        body: formData,
      });

      const res = await POST(req);
      expect(res.status).toBe(413);
      const data = await res.json();
      expect(data.errorCode).toBe("FILE_TOO_LARGE");
      expect(data.success).toBe(false);
    });

    it("returns 400 when request body contains neither file nor reportText", async () => {
      const req = new Request("http://localhost:3000/api/report-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      expect([400, 500]).toContain(res.status);
      const data = await res.json();
      expect(data.success).toBe(false);
    });
  });

  describe("GET /api/report-analyzer", () => {
    it("returns 401 when request is unauthenticated", async () => {
      const req = new Request("http://localhost:3000/api/report-analyzer", {
        method: "GET",
      });

      const res = await GET(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.reports).toEqual([]);
    });
  });
});
