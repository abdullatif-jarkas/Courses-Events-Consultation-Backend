import { stripeWebhook } from "@/controllers/StripeWebhook/stripeWebhook";
import express from "express";
const stripeRoutes = express.Router();

// ملاحظة: req.rawBody مطلوبة هنا
stripeRoutes.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);

export default stripeRoutes;
