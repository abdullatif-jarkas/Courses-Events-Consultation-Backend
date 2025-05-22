import { Schema, model, Document } from "mongoose";

export interface IRecordedCourseBooking extends Document {
  userId: Schema.Types.ObjectId;
  courseId: Schema.Types.ObjectId;
  recordedCourseId: Schema.Types.ObjectId;
  paymentStatus: "pending" | "paid" | "failed";
  sessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecordedCourseBookingSchema = new Schema<IRecordedCourseBooking>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    recordedCourseId: {
      type: Schema.Types.ObjectId,
      ref: "RecordedCourse",
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    sessionId: { type: String },
  },
  { timestamps: true }
);

export const RecordedCourseBooking = model<IRecordedCourseBooking>(
  "RecordedCourseBooking",
  RecordedCourseBookingSchema
);
