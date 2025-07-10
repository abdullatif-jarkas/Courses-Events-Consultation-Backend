import {
  bookInPersonCourse,
  verifyInPersonCoursePayment,
  handleStripeWebhook,
  cleanupExpiredBookings,
  getUserBookings,
} from "@/controllers/Courses/coursePayments.controller";
import {
  createInPersonCourse,
  deleteInPersonCourse,
  getAllInPersonCourses,
  getInPersonCourseById,
  updateInPersonCourse,
} from "@/controllers/Courses/inPersonCourse.controller";

import verifyToken from "@/middlewares/auth.middleware";
import { authorizeRoles } from "@/middlewares/role.middleware";

import { Router } from "express";

const inPersonCourseRoutes = Router();

// 📚 إدارة الكورسات الحضورية (Admin)
inPersonCourseRoutes
  .route("/")
  .get(getAllInPersonCourses)
  .post(verifyToken, authorizeRoles("admin"), createInPersonCourse);

inPersonCourseRoutes
  .route("/:id")
  .get(getInPersonCourseById)
  .delete(verifyToken, authorizeRoles("admin"), deleteInPersonCourse)
  .put(verifyToken, authorizeRoles("admin"), updateInPersonCourse);

// 💳 الدفع وحجوزات الكورسات الحضورية

// إنشاء جلسة الدفع
inPersonCourseRoutes.post("/checkout-session", verifyToken, bookInPersonCourse);

// التحقق من الدفع
inPersonCourseRoutes.post(
  "/verify-payment",
  verifyToken,
  verifyInPersonCoursePayment
);

// حجوزات المستخدم الحالي
inPersonCourseRoutes.get("/bookings/user", verifyToken, getUserBookings);

// تنظيف الحجوزات المنتهية الصلاحية (Admin فقط)
inPersonCourseRoutes.delete(
  "/cleanup-expired",
  verifyToken,
  authorizeRoles("admin"),
  cleanupExpiredBookings
);

export default inPersonCourseRoutes;
