import mongoose, { Schema, Document } from "mongoose";

export interface IInPersonCourseBooking extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  paymentMethod: "stripe" | "cash" | "internal";
  paymentStatus: "pending" | "paid" | "failed";
  status: "pending" | "confirmed" | "cancelled";
  stripeSessionId?: string;
  expiresAt?: Date;
  paidAt?: Date;
}

const inPersonCourseBookingSchema = new Schema<IInPersonCourseBooking>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "InPersonCourse", required: true },
    paymentMethod: {
      type: String,
      enum: ["stripe", "cash", "internal"],
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
