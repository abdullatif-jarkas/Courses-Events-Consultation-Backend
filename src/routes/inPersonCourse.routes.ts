import { bookInPersonCourse, verifyInPersonCoursePayment } from "@/controllers/Courses/coursePayments.controller";
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
inPersonCourseRoutes.post(
  "/checkout-session",
  verifyToken,
  bookInPersonCourse
);

// التحقق من الدفع
inPersonCourseRoutes.post(
  "/verify-payment",
  verifyToken,
  verifyInPersonCoursePayment
);

// حجوزات المستخدم الحالي
// inPersonCourseRoutes.get(
//   "/my-bookings",
//   verifyToken,
//   getInPersonCourseBookings
// );

// كل المدفوعات (Admin فقط)
// inPersonCourseRoutes.get(
//   "/all-payments",
//   verifyToken,
//   authorizeRoles("admin"),
//   getAllInPersonCoursePayments
// );

export default inPersonCourseRoutes;
