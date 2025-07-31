import { Router } from "express";
import {
  createFAQ,
  getFAQs,
  getAdminFAQs,
  updateFAQ,
  deleteFAQ,
  toggleFAQStatus,
} from "@/controllers/FAQs/faq.controller";
import verifyToken from "@/middlewares/auth.middleware";
import { authorizeRoles } from "@/middlewares/role.middleware";
import rateLimit from "express-rate-limit";

const faqRoutes = Router();

//~ Rate limiting for public endpoints
const publicFAQRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    status: "error",
    message: "طلبات كثيرة جداً، يرجى المحاولة لاحقاً",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

//~ Rate limiting for admin operations
const adminFAQRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Higher limit for admin operations
  message: {
    status: "error",
    message: "طلبات إدارية كثيرة جداً، يرجى المحاولة لاحقاً",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

//* Public routes (no authentication required)
faqRoutes.get("/", publicFAQRateLimit, getFAQs);
// faqRoutes.get("/:id", publicFAQRateLimit, getFAQById);

//^ Admin-only routes (authentication + admin role required)
faqRoutes.get(
  "/admin/all",
  adminFAQRateLimit,
  verifyToken,
  authorizeRoles("admin"),
  getAdminFAQs
);

faqRoutes.post(
  "/",
  adminFAQRateLimit,
  verifyToken,
  authorizeRoles("admin"),
  createFAQ
);

faqRoutes.put(
  "/:id",
  adminFAQRateLimit,
  verifyToken,
  authorizeRoles("admin"),
  updateFAQ
);

faqRoutes.delete(
  "/:id",
  adminFAQRateLimit,
  verifyToken,
  authorizeRoles("admin"),
  deleteFAQ
);

faqRoutes.patch(
  "/:id/toggle-status",
  adminFAQRateLimit,
  verifyToken,
  authorizeRoles("admin"),
  toggleFAQStatus
);

export default faqRoutes;
