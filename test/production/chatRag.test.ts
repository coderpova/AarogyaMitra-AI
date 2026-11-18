import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock heavy local ML embedding to run seamlessly in Node test environment
jest.mock("@/lib/embed", () => ({
  __esModule: true,
  embed: jest.fn().mockResolvedValue(new Array(384).fill(0)),
}));

import {
  isMedicalQuery,
  normalizeQuery,
  calculateRelevanceScore,
  resolveContextualQuery,
} from "@/lib/ragService";
import { detectEmergency } from "@/lib/healthAssistant";
import { detectLanguageStyle, parseActionTags, stripActionTags } from "@/lib/chatActions";

describe("Chat & RAG Core Functionality Test Suite", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
  });

  describe("isMedicalQuery", () => {
    it("identifies medical queries in English", () => {
      expect(isMedicalQuery("how to manage fever")).toBe(true);
      expect(isMedicalQuery("my blood pressure is high")).toBe(true);
      expect(isMedicalQuery("first aid for a cut wound")).toBe(true);
      expect(isMedicalQuery("symptoms of dehydration")).toBe(true);
      expect(isMedicalQuery("how to treat a common cold")).toBe(true);
    });

    it("identifies medical queries in Hinglish", () => {
      expect(isMedicalQuery("bukhar me kya kare")).toBe(true);
      expect(isMedicalQuery("mera BP high rehta hai")).toBe(true);
      expect(isMedicalQuery("sardi zukam ka gharelu ilaj")).toBe(true);
      expect(isMedicalQuery("pani ki kami kaise door kare")).toBe(true);
    });

    it("identifies medical queries in Hindi Devanagari script", () => {
      expect(isMedicalQuery("बुखार में क्या करना चाहिए")).toBe(true);
      expect(isMedicalQuery("मेरा रक्तचाप बहुत बढ़ा हुआ है")).toBe(true);
      expect(isMedicalQuery("गले में खराश और खांसी का इलाज")).toBe(true);
    });

    it("rejects non-medical or adversarial queries", () => {
      expect(isMedicalQuery("write a javascript python code to sort an array")).toBe(false);
      expect(isMedicalQuery("explain css animation and html structure")).toBe(false);
      expect(isMedicalQuery("what is the statistical algorithm for economics?")).toBe(false);
      expect(isMedicalQuery("tell me a funny joke")).toBe(false);
      expect(isMedicalQuery("")).toBe(false);
    });
  });

  describe("normalizeQuery", () => {
    it("strips stop phrases and punctuation", () => {
      const normalized = normalizeQuery("How to manage fever???");
      expect(normalized).toBe("fever");
    });

    it("normalizes Hinglish queries", () => {
      const normalized = normalizeQuery("bukhar hone par kya kare?");
      expect(normalized).toContain("bukhar");
    });

    it("normalizes Hindi queries", () => {
      const normalized = normalizeQuery("बुखार में क्या करना चाहिए?");
      expect(normalized).toContain("बुखार");
    });

    it("collapses multiple consecutive whitespace characters", () => {
      const normalized = normalizeQuery("  high   blood   pressure   ");
      expect(normalized).toBe("high blood pressure");
    });
  });

  describe("calculateRelevanceScore", () => {
    const sampleDoc = {
      title: "Hypertension Clinical Guidelines",
      category: "Cardiovascular",
      tags: ["bp", "blood pressure", "hypertension", "heart"],
      content: "Hypertension is defined as systolic BP over 130 or diastolic over 80 mmHg. Lifestyle modifications include reduced sodium intake.",
    };

    it("assigns high score when query matches document title", () => {
      const score = calculateRelevanceScore("hypertension clinical guidelines", sampleDoc);
      expect(score).toBeGreaterThan(10);
    });

    it("boosts score for category or tag matches", () => {
      const tagScore = calculateRelevanceScore("blood pressure management", sampleDoc);
      expect(tagScore).toBeGreaterThan(1.0);

      const categoryScore = calculateRelevanceScore("cardiovascular", sampleDoc);
      expect(categoryScore).toBeGreaterThan(5.0);
    });

    it("returns baseline score for queries with no matching terms", () => {
      const unrelatedScore = calculateRelevanceScore("fractured ankle bone", sampleDoc, 1.0);
      expect(unrelatedScore).toBe(1.0);
    });
  });

  describe("resolveContextualQuery", () => {
    it("resolves pronouns from previous conversation turn", () => {
      const history = [
        { role: "user", text: "I have high fever and severe headache" },
        { role: "ai", text: "Please rest and stay hydrated." },
      ];
      const resolved = resolveContextualQuery("What medicine should I take for it?", history);
      expect(resolved.toLowerCase()).toContain("fever");
    });

    it("keeps standalone query unchanged when context is not needed", () => {
      const history = [
        { role: "user", text: "What is healthy diet?" },
        { role: "ai", text: "Eat fruits and vegetables." },
      ];
      const resolved = resolveContextualQuery("How to control diabetes?", history);
      expect(resolved).toBe("How to control diabetes?");
    });
  });

  describe("detectEmergency (Immediate Safety Bypass)", () => {
    it("detects cardiac emergency symptoms in English", () => {
      const result = detectEmergency("I have crushing chest pain and sweating");
      expect(result.isEmergency).toBe(true);
      expect(result.responseEn).toContain("112");
      expect(result.responseEn).toContain("108");
    });

    it("detects cardiac emergency symptoms in Hinglish", () => {
      const result = detectEmergency("mujhe seene me dard ho raha hai bohot tez");
      expect(result.isEmergency).toBe(true);
      expect(result.responseHi).toContain("112");
    });

    it("detects breathing emergency symptoms in Hindi", () => {
      const result = detectEmergency("मरीज को सांस लेने में बहुत परेशानी हो रही है");
      expect(result.isEmergency).toBe(true);
      expect(result.responseHi).toContain("112");
    });

    it("returns isEmergency false for routine non-emergency queries", () => {
      const result = detectEmergency("I have a mild runny nose and cough");
      expect(result.isEmergency).toBe(false);
      expect(result.responseEn).toBeNull();
    });
  });

  describe("detectLanguageStyle", () => {
    it("detects Hinglish style", () => {
      expect(detectLanguageStyle("kl mne kitna pani piya tha")).toBe("hinglish");
      expect(detectLanguageStyle("mera bukhar kab thik hoga")).toBe("hinglish");
    });

    it("detects Hindi Devanagari style", () => {
      expect(detectLanguageStyle("नमस्ते, मुझे डॉक्टर से बात करनी है")).toBe("hindi_devanagari");
    });

    it("defaults to English for English input", () => {
      expect(detectLanguageStyle("Hello, what are remedies for dehydration?")).toBe("english");
    });
  });

  describe("parseActionTags & stripActionTags", () => {
    it("parses valid appointment and hospital action tags", () => {
      const text = "Booking scheduled: [ACTION:BOOK_APPOINTMENT {\"doctor\":\"Dr. Sharma\",\"date\":\"2026-10-15\"}]";
      const actions = parseActionTags(text);
      expect(actions.length).toBe(1);
      expect(actions[0].actionType).toBe("BOOK_APPOINTMENT");
      expect(actions[0].params.doctor).toBe("Dr. Sharma");
    });

    it("strips action tags cleanly from user-facing text", () => {
      const raw = "Here is your hospital info [FIND_HOSPITAL] {\"city\":\"Delhi\"} [/FIND_HOSPITAL]. Please arrive on time.";
      const cleaned = stripActionTags(raw);
      expect(cleaned).not.toContain("[FIND_HOSPITAL]");
      expect(cleaned).toContain("Please arrive on time.");
    });
  });
});
