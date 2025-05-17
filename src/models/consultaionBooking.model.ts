import { Schema, model } from "mongoose";
import { IBooking } from "@/types/consultationBooking";

const ConsultationBookingSchema = new Schema<IBooking>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    consultationId: {
      type: Schema.Types.ObjectId,
      ref: "Consultation",
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["stripe", "external", "cash"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "unpaid"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    stripeSessionId: {
      type: String,
      required: false, // سيتم تعيينه فقط في حالة استخدام Stripe.
    },
  },
  { timestamps: true }
);

export const ConsultationBooking = model<IBooking>(
  "ConsultationBooking",
  ConsultationBookingSchema
);
