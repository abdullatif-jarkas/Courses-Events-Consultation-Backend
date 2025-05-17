import express from "express";
import verifyToken from "@/middlewares/auth.middleware";
import { authorizeRoles } from "@/middlewares/role.middleware";
import { bookConsultation, createConsultation, getAvailableConsultations } from "@/controllers/Consultations/consultation.controller";
import { createStripeCheckoutSession, getPaymentHistory, getAllPayments, verifyPayment } from "@/controllers/Consultations/payment.controller";

const consultationRoutes = express.Router();

//^ Admin routes
consultationRoutes.post("/", verifyToken, authorizeRoles("admin"), createConsultation);

consultationRoutes.get("/available", verifyToken, getAvailableConsultations);

consultationRoutes.put("/book/:id", verifyToken, bookConsultation);

//* Payment routes
consultationRoutes.post("/create-checkout-session", verifyToken, createStripeCheckoutSession);
consultationRoutes.get("/verify-payment", verifyToken, verifyPayment);
consultationRoutes.get("/payments-history", verifyToken, getPaymentHistory);
consultationRoutes.get("/all-payments", verifyToken, authorizeRoles("admin"), getAllPayments);

export default consultationRoutes;

