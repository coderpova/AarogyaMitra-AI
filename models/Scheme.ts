import { Schema, models, model } from "mongoose";

const SchemeSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    benefit: {
      type: String,
      required: true,
    },

    documents: {
      type: [String],
      default: [],
    },

    officialLink: {
      type: String,
      default: "",
    },

    eligibility: {
      minAge: Number,
      maxAge: Number,
      maxIncome: Number,
      gender: String,
      pregnant: Boolean,
      seniorCitizen: Boolean,
      disability: Boolean,
    },
  },
  {
    timestamps: true,
  }
);

export default models.Scheme || model("Scheme", SchemeSchema);