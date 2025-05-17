import { Types } from "mongoose";

export interface IBooking {
  userId: Types.ObjectId;               // المستخدم الذي قام بالحجز
  consultationId: Types.ObjectId;       // الاستشارة التي تم حجزها
  paymentMethod: "stripe" | "internal" | "cash";  // طريقة الدفع
  paymentStatus: "pending" | "paid" | "failed";   // حالة الدفع
  status: "pending" | "confirmed" | "cancelled";  // حالة الحجز
  stripeSessionId?: string;             // رقم الجلسة في Stripe (اختياري)
  createdAt?: Date;                     // تاريخ الإنشاء
  updatedAt?: Date;                     // تاريخ التعديل
}