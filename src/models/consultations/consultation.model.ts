import { Schema, model } from "mongoose";
import { IConsultation } from "@/types/consultation";

const ConsultationSchema = new Schema<IConsultation>(
  {
    consultationType: {
      type: String,
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
      unique: true,
    },
    price: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["available", "booked", "confirmed", "completed", "cancelled"],
      default: "available",
    },
  },
  { timestamps: true }
);

export const Consultation = model<IConsultation>(
  "Consultation",
  ConsultationSchema
);
