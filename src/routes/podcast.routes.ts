import { Router } from "express";
import {
  createPodcast,
  getPodcasts,
  getAdminPodcasts,
  getPodcastById,
  updatePodcast,
  deletePodcast,
  togglePodcastStatus,
} from "@/controllers/Podcasts/podcast.controller";
import verifyToken from "@/middlewares/auth.middleware";
import { authorizeRoles } from "@/middlewares/role.middleware";
import rateLimit from "express-rate-limit";

const podcastRoutes = Router();

// Rate limiting for public endpoints
const publicPodcastRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    status: "error",
    message: "طلبات كثيرة جداً، يرجى المحاولة لاحقاً",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for admin operations
const adminPodcastRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Higher limit for admin operations
  message: {
    status: "error",
    message: "طلبات إدارية كثيرة جداً، يرجى المحاولة لاحقاً",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes (no authentication required)
podcastRoutes.get("/", publicPodcastRateLimit, getPodcasts);
podcastRoutes.get("/:id", publicPodcastRateLimit, getPodcastById);

// Admin-only routes (authentication + admin role required)
podcastRoutes.get(
  "/admin/all",
  adminPodcastRateLimit,
  verifyToken,
  authorizeRoles("admin"),
  getAdminPodcasts
);

podcastRoutes.post(
  "/",
  adminPodcastRateLimit,
  verifyToken,
  authorizeRoles("admin"),
  createPodcast
);

podcastRoutes.put(
  "/:id",
  adminPodcastRateLimit,
  verifyToken,
  authorizeRoles("admin"),
  updatePodcast
);

podcastRoutes.delete(
  "/:id",
  adminPodcastRateLimit,
  verifyToken,
  authorizeRoles("admin"),
  deletePodcast
);

podcastRoutes.patch(
  "/:id/toggle-status",
  adminPodcastRateLimit,
  verifyToken,
  authorizeRoles("admin"),
  togglePodcastStatus
);

export default podcastRoutes;
