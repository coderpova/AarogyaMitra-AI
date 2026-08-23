import { Schema, models, model } from "mongoose";

const MedicineSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    dose: {
      type: String,
      required: true,
      trim: true,
    },

    time: {
      type: String,
      required: true,
    },

    reminder: {
      type: Boolean,
      default: true,
    },

    taken: {
      type: Boolean,
      default: false,
    },

    date: {
      type: String,
      default: "",
    },

    frequency: {
      type: String,
      enum: ["Once", "Daily", "Custom"],
      default: "Daily",
    },

    customDays: {
      type: [String],
      default: [],
    },

    source: {
      type: String,
      enum: ["USER_REPORTED", "PRESCRIPTION", "USER_CONFIRMED"],
      default: "USER_REPORTED",
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

export default models.Medicine || model("Medicine", MedicineSchema);