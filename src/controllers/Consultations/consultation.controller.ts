import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Consultation } from "@/models/consultations/consultation.model";

/**
 * @route   POST /api/consultations
 * @access  Private (Admin)
 */

export const createConsultation = asyncHandler(
  async (req: Request, res: Response) => {
    const { scheduledAt, price } = req.body;

    //? التحقق من السعر
    if (!price || typeof price !== "number" || price <= 0) {
      res.status(400).json({
        status: "error",
        message: "A valid price must be provided.",
      });
      return;
    }

    //? التحقق من التاريخ
    if (!scheduledAt || isNaN(Date.parse(scheduledAt))) {
      res.status(400).json({ status: "error", message: "Invalid date" });
      return;
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate < new Date()) {
      res.status(400).json({
        status: "error",
        message: "You cannot schedule a consultation in the past.",
      });
      return;
    }

    //? توحيد التاريخ (اختياري حسب المنطق عندك)
    scheduledDate.setSeconds(0);
    scheduledDate.setMilliseconds(0);

    //? التحقق من عدم وجود استشارة بنفس الوقت
    const exists = await Consultation.findOne({ scheduledAt: scheduledDate });
    if (exists) {
      res.status(400).json({
        status: "error",
        message: "Consultation already exists at this time.",
      });
      return;
    }

    //* الإنشاء
    const consultation = await Consultation.create({
      consultationType: "online",
      scheduledAt: scheduledDate,
      price,
      status: "available",
    });

    res.status(201).json({
      status: "success",
      data: {
        id: consultation._id,
        scheduledAt: consultation.scheduledAt,
        price: consultation.price,
      },
    });
  }
);

/**
 * @route   GET /api/consultations/available?month=7&year=2025
 * @access  Private (User)
 */
export const getAvailableConsultations = asyncHandler(
  async (req: Request, res: Response) => {
    const { month, year } = req.query;

    const filter: any = { status: "available" };

    // إذا تم تمرير month و year بشكل صحيح، نقوم بتحديد الفترة الزمنية
    const monthNum = Number(month);
    const yearNum = Number(year);
    console.log(monthNum, yearNum);
    if (!isNaN(monthNum) && !isNaN(yearNum) &&
      monthNum >= 1 &&
      monthNum <= 12 &&
      yearNum >= 1900
    ) {
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
      filter.scheduledAt = { $gte: startDate, $lte: endDate };
    }
    // جلب الاستشارات المتاحة (كاملة أو ضمن شهر معين)
    const consultations = await Consultation.find(filter).sort({ scheduledAt: 1 });

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
