import { IInPersonCourseBooking } from "@/types/inPersonCourseBooking";
import mongoose, { Schema, Document } from "mongoose";

const inPersonCourseBookingSchema = new Schema<IInPersonCourseBooking>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "InPersonCourse",
      required: true,
    },
    inPersonCourseId: {
      type: Schema.Types.ObjectId,
      ref: "InPersonCourse",
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["stripe", "cash", "external"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    stripeSessionId: { type: String },
    expiresAt: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export const InPersonCourseBooking = mongoose.model<IInPersonCourseBooking>(
  "InPersonCourseBooking",
  inPersonCourseBookingSchema
);
