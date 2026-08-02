import { Schema, model, models } from "mongoose";

const AppointmentSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },

    patientName: {
      type: String,
      required: true,
      trim: true,
    },

    doctorName: {
      type: String,
      required: true,
      trim: true,
    },

    hospital: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: String,
      required: true,
    },

    time: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["Booked", "Completed", "Cancelled"],
      default: "Booked",
    },
  },
  {
    timestamps: true,
  }
);

export default models.Appointment ||
  model("Appointment", AppointmentSchema);