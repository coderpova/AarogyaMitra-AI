import mongoose, { Schema, models, model } from "mongoose";

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
  },
  {
    timestamps: true,
  }
);

export default models.Medicine || model("Medicine", MedicineSchema);