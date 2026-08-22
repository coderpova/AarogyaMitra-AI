// frontend/models/MedicalKnowledge.ts
import mongoose, { Schema, models } from "mongoose";

const medicalKnowledgeSchema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, required: true },
    tags: [{ type: String }],
    source: { type: String, required: true },
    sourceUrl: { type: String },
    language: { type: String, default: "en" }, // 'en' or 'hi'
    evidenceLevel: {
      type: String,
      enum: [
        "Government / Health Authority",
        "Clinical Guideline",
        "Trusted Medical Reference",
        "General Health Guidance",
        "Unknown"
      ],
      default: "General Health Guidance"
    },
    medicalTopic: { type: String, default: "General Medicine" },
    reviewed: { type: Boolean, default: true },
    lastReviewedAt: { type: Date, default: Date.now },
    version: { type: String, default: "1.0.0" },
    // NEW: optional dense embedding vector for semantic search
    embedding: { type: [Number], select: false } // not selected by default for keyword path
  },
  {
    timestamps: true,
  }
);

// Add compound text index for keyword and context search
medicalKnowledgeSchema.index(
  {
    title: "text",
    content: "text",
    category: "text",
    tags: "text",
  },
  {
    weights: {
      title: 10,
      category: 5,
      tags: 3,
      content: 1,
    },
    name: "medical_knowledge_text_index",
    language_override: "none",
  }
);

const MedicalKnowledge = models.MedicalKnowledge || mongoose.model("MedicalKnowledge", medicalKnowledgeSchema);

export default MedicalKnowledge;
