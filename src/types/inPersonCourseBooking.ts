export interface IInPersonCourseBooking extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Schema.Types.ObjectId;
  inPersonCourseId: mongoose.Schema.Types.ObjectId;
  paymentMethod: "stripe" | "cash" | "external";
  paymentStatus: "pending" | "paid" | "failed";
  status: "pending" | "confirmed" | "cancelled";
  stripeSessionId?: string;
  expiresAt?: Date;
  paidAt?: Date;
}