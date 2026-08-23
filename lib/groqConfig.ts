import Groq from "groq-sdk";

/**
 * Centralized Groq Model Configuration
 * Primary model: process.env.GROQ_MODEL || "qwen/qwen3.6-27b"
 */
export function getGroqModel(): string {
  return process.env.GROQ_MODEL || "qwen/qwen3.6-27b";
}

/**
 * Centralized Groq Client Factory
 */
export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY || "";
  return new Groq({ apiKey });
}
