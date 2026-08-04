import mongoose, { Schema, models, model } from "mongoose";

const ReportHistorySchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      default: "Medical Report Analysis",
    },
    summary: {
      type: String,
      required: true,
    },
    specialistToConsult: {
      type: String,
      default: "General Physician",
    },
    parameters: [
      {
        name: String,
        value: String,
        normalRange: String,
        status: {
          type: String,
          enum: ["Normal", "High", "Low", "Critical"],
          default: "Normal",
        },
      },
    ],
    recommendations: [String],
    rawText: String,
  },
  {
    timestamps: true,
  }
);

export default models.ReportHistory ||
  model("ReportHistory", ReportHistorySchema);
