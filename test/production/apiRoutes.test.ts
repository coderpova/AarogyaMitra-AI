process.env.JWT_SECRET = "test_super_secret_jwt_key_aarogya_2026";

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { signJwt } from "@/lib/jwtHelper";

// ── Mock MongoDB Connection ──────────────────────────────────────────────────
jest.mock("@/lib/mongodb", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({}),
}));

// ── Mock Database Models ─────────────────────────────────────────────────────
const mockUser = {
  _id: "user_test_999",
  name: "Priya Sharma",
  email: "priya.sharma@aarogya.gov.in",
  password: "$2a$10$hashedpasswordhere",
  settings: { language: "en" },
  gmail: { connected: false },
};

jest.mock("@/models/User", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock("@/models/Appointment", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.mock("@/models/chat", () => ({
  __esModule: true,
  default: {
    create: jest.fn().mockResolvedValue({}),
  },
}));

// ── Mock bcrypt ──────────────────────────────────────────────────────────────
jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: {
    compare: jest.fn(),
    hash: jest.fn().mockResolvedValue("hashed_password_sample"),
  },
}));

// ── Mock Groq & Transformers ────────────────────────────────────────────────
jest.mock("@/lib/groqConfig", () => ({
  __esModule: true,
  getGroqModel: jest.fn().mockReturnValue("qwen/qwen3.6-27b"),
  getGroqClient: jest.fn().mockReturnValue({
    chat: { completions: { create: jest.fn() } },
  }),
}));

jest.mock("@/lib/embed", () => ({
  __esModule: true,
  embed: jest.fn().mockResolvedValue(new Array(384).fill(0)),
}));

import { POST as loginPOST } from "@/app/api/login/route";
import { POST as registerPOST } from "@/app/api/register/route";
import { GET as appointmentsGET, POST as appointmentsPOST, DELETE as appointmentsDELETE, PATCH as appointmentsPATCH } from "@/app/api/appointments/route";
import { PUT as settingsPUT } from "@/app/api/user/settings/route";
import { POST as chatPOST } from "@/app/api/chat/route";

import User from "@/models/User";
import Appointment from "@/models/Appointment";
import bcrypt from "bcryptjs";

describe("API Routes Integration & Error Handling Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test_super_secret_jwt_key_aarogya_2026";
  });

  describe("POST /api/login", () => {
    it("returns 400 Bad Request when credentials are missing or empty", async () => {
      const req = new Request("http://localhost:3000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "", password: "" }),
      });

      const res = await loginPOST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("BAD_REQUEST");
    });

    it("returns 401 when user does not exist", async () => {
      (User.findOne as any).mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "unknown@aarogya.in", password: "Password123" }),
      });

      const res = await loginPOST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("UNAUTHORIZED");
    });

    it("returns 401 when password does not match", async () => {
      (User.findOne as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      const req = new Request("http://localhost:3000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mockUser.email, password: "WrongPassword" }),
      });

      const res = await loginPOST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("UNAUTHORIZED");
    });

    it("returns 200 and sets HttpOnly session cookie on valid credentials", async () => {
      (User.findOne as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);

      const req = new Request("http://localhost:3000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mockUser.email, password: "CorrectPassword123" }),
      });

      const res = await loginPOST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe("Login successful");
      expect(data.token).toBeDefined();
      expect(data.user.email).toBe(mockUser.email);

      // Verify Set-Cookie header contains HttpOnly token
      const cookieHeader = res.headers.get("set-cookie");
      expect(cookieHeader).toBeDefined();
      expect(cookieHeader).toContain("token=");
      expect(cookieHeader).toContain("HttpOnly");
    });
  });

  describe("POST /api/register", () => {
    it("returns 400 when fields are missing or empty", async () => {
      const req = new Request("http://localhost:3000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "", email: "", password: "" }),
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for short name or invalid email format", async () => {
      const reqShortName = new Request("http://localhost:3000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "A", email: "valid@aarogya.in", password: "Password123" }),
      });
      const res1 = await registerPOST(reqShortName);
      expect(res1.status).toBe(400);

      const reqBadEmail = new Request("http://localhost:3000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Aarav", email: "not-an-email", password: "Password123" }),
      });
      const res2 = await registerPOST(reqBadEmail);
      expect(res2.status).toBe(400);
    });

    it("returns 400 for password less than 6 characters", async () => {
      const req = new Request("http://localhost:3000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Aarav", email: "aarav@aarogya.in", password: "123" }),
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(400);
    });

    it("returns 409 Conflict when user email is already registered", async () => {
      (User.findOne as any).mockResolvedValue(mockUser);

      const req = new Request("http://localhost:3000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Priya Sharma", email: mockUser.email, password: "SecurePassword123" }),
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(409);
    });

    it("returns 201 Created on valid registration", async () => {
      (User.findOne as any).mockResolvedValue(null);
      (User.create as any).mockResolvedValue({
        _id: "user_new_101",
        name: "Rohan Patel",
        email: "rohan.patel@aarogya.in",
      });

      const req = new Request("http://localhost:3000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Rohan Patel", email: "rohan.patel@aarogya.in", password: "ValidPassword123" }),
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.token).toBeDefined();
      expect(data.user.email).toBe("rohan.patel@aarogya.in");
    });
  });

  describe("/api/appointments", () => {
    const getToken = () => signJwt({ userId: mockUser._id });

    it("returns 401 Unauthorized when accessing GET without token", async () => {
      const req = new Request("http://localhost:3000/api/appointments", { method: "GET" });
      const res = await appointmentsGET(req);
      expect(res.status).toBe(401);
    });

    it("returns 200 with appointments list when authenticated", async () => {
      (Appointment.find as any).mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          { _id: "apt_1", doctorName: "Dr. Verma", hospital: "AIIMS Delhi", date: "2026-12-01", time: "10:00 AM" },
        ]),
      });

      const req = new Request("http://localhost:3000/api/appointments", {
        method: "GET",
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      const res = await appointmentsGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.appointments)).toBe(true);
      expect(data.appointments.length).toBe(1);
    });

    it("returns 400 Bad Request when POSTing appointment with missing fields", async () => {
      const req = new Request("http://localhost:3000/api/appointments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ patientName: "Aarav" }), // missing doctorName, hospital, date, time
      });

      const res = await appointmentsPOST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.message).toContain("required");
    });

    it("returns 201 when booking a complete appointment", async () => {
      (Appointment.create as any).mockResolvedValue({
        _id: "apt_new_55",
        patientName: "Aarav",
        doctorName: "Dr. Gupta",
        hospital: "Apollo Hospital",
        date: "2026-11-25",
        time: "11:30 AM",
        status: "Booked",
      });
      (Appointment.find as any).mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      });

      const req = new Request("http://localhost:3000/api/appointments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientName: "Aarav",
          doctorName: "Dr. Gupta",
          hospital: "Apollo Hospital",
          date: "2026-11-25",
          time: "11:30 AM",
        }),
      });

      const res = await appointmentsPOST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.appointment).toBeDefined();
    });

    it("returns 400 on DELETE when appointment ID is missing", async () => {
      const req = new Request("http://localhost:3000/api/appointments", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const res = await appointmentsDELETE(req);
      expect(res.status).toBe(400);
    });

    it("returns 404 on DELETE when appointment is not found", async () => {
      (Appointment.findOne as any).mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/appointments", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: "non_existent_id" }),
      });

      const res = await appointmentsDELETE(req);
      expect(res.status).toBe(404);
    });

    it("returns 400 on PATCH when appointment id is missing", async () => {
      const token = getToken();
      const req = new Request("http://localhost:3000/api/appointments", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "completed" }),
      });

      const res = await appointmentsPATCH(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.message).toBe("Appointment ID is required");
    });
  });

  describe("PUT /api/user/settings", () => {
    const getToken = () => signJwt({ userId: mockUser._id });

    it("returns 401 when unauthenticated", async () => {
      const req = new Request("http://localhost:3000/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "hi" }),
      });

      const res = await settingsPUT(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 when language is invalid", async () => {
      const req = new Request("http://localhost:3000/api/user/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ language: "unsupported_lang" }),
      });

      const res = await settingsPUT(req);
      expect(res.status).toBe(400);
    });

    it("returns 200 when updating to valid supported language ('hi')", async () => {
      (User.findByIdAndUpdate as any).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: mockUser._id,
          name: mockUser.name,
          settings: { language: "hi" },
        }),
      });

      const req = new Request("http://localhost:3000/api/user/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ language: "hi" }),
      });

      const res = await settingsPUT(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.settings.language).toBe("hi");
    });
  });

  describe("POST /api/chat - Route Level Safeguards", () => {
    it("returns 401 Unauthorized when unauthenticated", async () => {
      const req = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Hello doctor" }),
      });

      const res = await chatPOST(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 Bad Request when message is empty string", async () => {
      const validToken = signJwt({ userId: mockUser._id });
      const req = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${validToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "   " }),
      });

      const res = await chatPOST(req);
      expect(res.status).toBe(400);
    });

    it("immediately triggers Emergency Bypass returning 112/108 helpline guidance for acute chest pain", async () => {
      const validToken = signJwt({ userId: mockUser._id });
      const req = new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${validToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "severe chest pain radiating to left arm" }),
      });

      const res = await chatPOST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.emergency).toBe(true);
      expect(data.reply).toContain("112");
      expect(data.reply).toContain("108");
      expect(Array.isArray(data.suggestions)).toBe(true);
    });
  });
});
