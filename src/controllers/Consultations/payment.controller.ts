import { ConsultationBooking } from "@/models/consultations/consultaionBooking.model";
import { Consultation } from "@/models/consultations/consultation.model";
import { stripe } from "@/utils/stripe";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

//* For Online Booking
export const createStripeCheckoutSession = asyncHandler(
  async (req: Request, res: Response) => {
    const { consultationId } = req.body;

    //* 1. Get the consultation
    const consultation = await Consultation.findById(consultationId);

    //* 2. Ensure that the consultation is available
    if (!consultation) {
      res.status(404).json({
        status: "error",
        message: "الاستشارة غير موجودة",
      });
      return;
    }

    if (consultation.status !== "available") {
      res.status(400).json({
        status: "error",
        message: "الاستشارة غير متاحة للحجز",
      });
      return;
    }

    if (!consultation.price || consultation.price <= 0) {
      res.status(400).json({
        status: "error",
        message: "سعر الاستشارة غير صحيح",
      });
      return;
    }

    try {
      //* 3. create stripe session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Consultation: ${consultation.consultationType}`,
              },
              unit_amount: consultation.price * 100, //? price in cents
            },
            quantity: 1,
          },
        ],
        success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&consultationId=${consultation._id}`,
        cancel_url: `${process.env.CLIENT_URL}/consultations/${consultationId}?canceled=true`,
        metadata: {
          consultationId: consultation._id.toString(),
          userId: req.user!.userId,
        },
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // انتهاء الصلاحية بعد 30 دقيقة
      });

      //* 4. Create booking record in the database (pending status)
      await ConsultationBooking.create({
        userId: req.user!.userId,
        consultationId: consultation._id,
        paymentMethod: "stripe",
        paymentStatus: "pending",
        status: "pending",
        stripeSessionId: session.id,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 دقيقة من الآن
      });

      //* 5. Return session url
      res.status(200).json({
        status: "success",
        sessionId: session.id,
        url: session.url,
      });
    } catch (error) {
      console.error("خطأ في إنشاء جلسة الدفع:", error);
      res.status(500).json({
        status: "error",
        message: "فشل في إنشاء جلسة الدفع",
      });
    }
  }
);

export const verifyPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { session_id, consultationId } = req.query;
    if (!session_id || !consultationId) {
      res.status(400).json({
        status: "error",
        message: "معرّف الجلسة أو الاستشارة مفقود",
      });
      return;
    }

    try {
      const session = await stripe.checkout.sessions.retrieve(
        session_id as string
      );

      if (session.payment_status === "paid") {
        const updatedBooking = await ConsultationBooking.findOneAndUpdate(
          { stripeSessionId: session_id },
          {
            paymentStatus: "paid",
            status: "confirmed",
            paidAt: new Date(),
          },
          { new: true }
        );

        if (!updatedBooking) {
          res.status(404).json({
            status: "error",
            message: "سجل الحجز غير موجود",
          });
          return;
        }

        const updatedConsultation = await Consultation.findByIdAndUpdate(
          consultationId,
          {
            status: "booked",
            userId: session.metadata?.userId,
            bookedAt: new Date(),
          },
          { new: true }
        );

        res.status(200).json({
          status: "success",
          message: "تم تأكيد الدفع بنجاح",
          booking: updatedBooking,
          consultation: updatedConsultation,
        });
        return;
      }

      res.status(200).json({
        status: "pending",
        message: "في انتظار إتمام الدفع",
      });
    } catch (error) {
      console.error("خطأ في التحقق من حالة الدفع:", error);
      res.status(500).json({
        status: "error",
        message: "فشل في التحقق من حالة الدفع",
      });
    }
  }
);

/**
 * @desc    Get payment history for a user
 * @route   GET /api/consultations/payment-history
 * @access  Private (User)
 */
export const getPaymentHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    try {
      // Find all bookings for this user
      const bookings = await ConsultationBooking.find({ userId })
        .populate({
          path: "consultationId",
          select: "consultationType scheduledAt price",
        })
        .sort({ createdAt: -1 });

      res.status(200).json({
        status: "success",
        count: bookings.length,
        data: bookings,
      });
    } catch (error) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch payment history",
      });
    }
  }
);

/**
 * @desc    Get all payments (admin only)
 * @route   GET /api/consultations/all-payments
 * @access  Private (Admin)
 */
export const getAllPayments = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Find all bookings
      const bookings = await ConsultationBooking.find()
        .populate({
          path: "consultationId",
          select: "consultationType scheduledAt price",
        })
        .populate({
          path: "userId",
          select: "fullName email",
        })
        .sort({ createdAt: -1 });

      res.status(200).json({
        status: "success",
        count: bookings.length,
        data: bookings,
      });
    } catch (error) {
      console.error("Error fetching all payments:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch payments",
      });
    }
  }
);
