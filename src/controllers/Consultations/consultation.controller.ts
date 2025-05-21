import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Consultation } from "@/models/consultations/consultation.model";

/**
 * @route   POST /api/consultations
 * @access  Private (Admin)
 */

export const createConsultation = asyncHandler(
  async (req: Request, res: Response) => {
    const { consultationType, scheduledAt, price } = req.body;

    if (!price || typeof price !== "number" || price <= 0) {
      res.status(400).json({
        status: "error",
        message: "A valid price must be provided.",
      });
      return;
    }

    const exists = await Consultation.findOne({ scheduledAt });
    if (exists) {
      res.status(400).json({
        status: "error",
        message: "Consultation already exists at this time.",
      });
      return;
    }

    const consultation = await Consultation.create({
      consultationType,
      scheduledAt,
      price,
      status: "available",
    });

    res.status(201).json({ status: "success", data: consultation });
  }
);

/**
 * @route   GET /api/consultations/available
 * @access  Private (User)
 */
export const getAvailableConsultations = asyncHandler(
  async (_req: Request, res: Response) => {
    const consultations = await Consultation.find({ status: "available" }).sort(
      { scheduledAt: 1 }
    );
    res.status(200).json({ status: "success", data: consultations });
  }
);

/**
 * @route   PUT /api/consultations/book/:id
 * @access  Private (User)
 */
export const bookConsultation = asyncHandler(
  async (req: Request, res: Response) => {
    const consultation = await Consultation.findById(req.params.id);

    if (!consultation || consultation.status !== "available") {
      res
        .status(400)
        .json({ status: "error", message: "Consultation not available" });
      return;
    }

    const { paymentMethod } = req.body;

    if (!["internal", "cash"].includes(paymentMethod)) {
      res.status(400).json({
        status: "error",
        message: "This method is only allowed for cash or internal transfer.",
      });
      return;
    }

    consultation.userId = req.user!.userId;
    consultation.status = "booked";
    consultation.paymentStatus = "pending"; // يتم تأكيدها يدويًا من قبل الإدارة لاحقًا
    consultation.paymentMethod = paymentMethod;

    await consultation.save();

    res.status(200).json({
      status: "success",
      data: consultation,
    });
  }
);
