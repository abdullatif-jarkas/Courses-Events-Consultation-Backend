import { Router } from "express";
import { handleStripeWebhook } from "@/controllers/Courses/coursePayments.controller";
import express from "express";

const webhookRoutes = Router();

// Stripe webhook endpoint - must use raw body parser
webhookRoutes.post(
  "/stripe/course-payments",
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

export default webhookRoutes;
