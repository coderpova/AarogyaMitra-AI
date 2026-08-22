import mongoose, { Schema, models, model } from "mongoose";

export type HealthEventType =
  | "symptom"
  | "condition"
  | "lab_result"
  | "medicine_started"
  | "allergy"
  | "vital_log"
  | "procedure";

export type HealthEventSource =
  | "USER_REPORTED"
  | "REPORT_EXTRACTED"
  | "USER_CONFIRMED"
  | "SYSTEM_DERIVED";

export type HealthEventSeverity =
  | "mild"
  | "moderate"
  | "severe"
  | "critical"
  | "";

export type HealthEventStatus =
  | "active"
  | "resolved"
  | "recurrent"
  | "chronic"
  | "unknown";

export interface IHealthEvent {
  _id?: string;
  userId: string;
  type: HealthEventType;
  symptom?: string;
  value?: string;
  severity?: HealthEventSeverity;
  startDate?: Date | null;
  endDate?: Date | null;
  status?: HealthEventStatus;
  notes?: string;
  source: HealthEventSource;
  reportId?: mongoose.Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HealthEventSchema = new Schema<IHealthEvent>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "symptom",
        "condition",
        "lab_result",
        "medicine_started",
        "allergy",
        "vital_log",
        "procedure",
      ],
      required: true,
      index: true,
    },
    symptom: {
      type: String,
      trim: true,
      default: "",
    },
    value: {
      type: String,
      trim: true,
      default: "",
    },
    severity: {
      type: String,
      enum: ["mild", "moderate", "severe", "critical", ""],
      default: "",
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "resolved", "recurrent", "chronic", "unknown"],
      default: "active",
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    source: {
      type: String,
      enum: [
        "USER_REPORTED",
        "REPORT_EXTRACTED",
        "USER_CONFIRMED",
        "SYSTEM_DERIVED",
      ],
      required: true,
      default: "USER_REPORTED",
    },
    reportId: {
      type: Schema.Types.ObjectId,
      ref: "ReportHistory",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

HealthEventSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });
HealthEventSchema.index({ userId: 1, type: 1, isDeleted: 1 });

const HealthEvent =
  models.HealthEvent || model<IHealthEvent>("HealthEvent", HealthEventSchema);

export default HealthEvent;
