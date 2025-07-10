import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Course } from "@/models/courses/course.model";
import { InPersonCourse } from "@/models/courses/inPersonCourse.model";
import { stripe } from "@/utils/stripe";
import { Types } from "mongoose";
import { InPersonCourseBooking } from "@/models/courses/inPersonCourseBooking.model";
import { z } from "zod";
import crypto from "crypto";

// Input validation schemas
const bookInPersonCourseSchema = z.object({
  paymentMethod: z.enum(["stripe", "cash", "external"]),
  inPersonCourseId: z.string().refine((id) => Types.ObjectId.isValid(id), {
    message: "معرف الدورة غير صالح",
  }),
});

const verifyPaymentSchema = z.object({
  session_id: z.string().min(1, "معرف الجلسة مطلوب"),
});

// Standardized response format
interface ApiResponse<T = any> {
  status: "success" | "error";
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

/**
 * @route   POST /api/in-person-courses/book/:id
 * @access  Private (User)
 */
export const bookInPersonCourse = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Input validation
      const validationResult = bookInPersonCourseSchema.safeParse(req.body);
      if (!validationResult.success) {
        const response: ApiResponse = {
          status: "error",
          message: "بيانات غير صالحة",
          errors: validationResult.error.flatten().fieldErrors,
        };
        res.status(400).json(response);
        return;
      }

      const { paymentMethod, inPersonCourseId } = validationResult.data;
      const userId = req.user!.userId;

      // Check for existing pending/paid bookings (duplicate prevention)
      const existingBooking = await InPersonCourseBooking.findOne({
        userId,
        inPersonCourseId,
        paymentStatus: { $in: ["pending", "paid"] },
        status: { $ne: "cancelled" },
      });

      if (existingBooking) {
        const response: ApiResponse = {
          status: "error",
          message: "لديك حجز مسبق لهذه الدورة",
        };
        res.status(409).json(response);
        return;
      }

      // Get course and in-person course details with atomic check
      const inPersonCourse = await InPersonCourse.findById(
        inPersonCourseId
      ).populate("courseId");
      if (!inPersonCourse) {
        const response: ApiResponse = {
          status: "error",
          message: "الدورة الحضورية غير موجودة",
        };
        res.status(404).json(response);
        return;
      }

      const course = inPersonCourse.courseId as any;
      if (!course) {
        const response: ApiResponse = {
          status: "error",
          message: "معلومات الكورس غير موجودة",
        };
        res.status(404).json(response);
        return;
      }

      const courseIdStr = course._id.toString();
      const inPersonCourseIdStr = (
        inPersonCourse._id as Types.ObjectId
      ).toString();

      // Handle Stripe payment
      if (paymentMethod === "stripe") {
        // Generate idempotency key to prevent duplicate charges
        const idempotencyKey = crypto.randomUUID();

        const session = await stripe.checkout.sessions.create(
          {
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  product_data: { name: `Course: ${course.title}` },
                  unit_amount: course.price * 100,
                },
                quantity: 1,
              },
            ],
            success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&courseId=${courseIdStr}&inPersonCourseId=${inPersonCourseIdStr}`,
            cancel_url: `${process.env.CLIENT_URL}/in-person-courses/${inPersonCourseIdStr}?canceled=true`,
            metadata: {
              courseId: courseIdStr,
              inPersonCourseId: inPersonCourseIdStr,
              userId: userId,
              bookingType: "in-person-course",
            },
            expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
          },
          {
            idempotencyKey,
          }
        );

        // Create booking record atomically
        await InPersonCourseBooking.create({
          userId,
          courseId: course._id,
          inPersonCourseId: inPersonCourse._id,
          paymentMethod: "stripe",
          paymentStatus: "pending",
          status: "pending",
          stripeSessionId: session.id,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        });

        const response: ApiResponse = {
          status: "success",
          message: "تم إنشاء جلسة الدفع بنجاح",
          data: { sessionId: session.id, url: session.url },
        };
        res.status(200).json(response);
      } else if (["external", "cash"].includes(paymentMethod)) {
        // Handle other payment methods
        const booking = await InPersonCourseBooking.create({
          userId,
          courseId: course._id,
          inPersonCourseId: inPersonCourse._id,
          paymentMethod,
          paymentStatus: "pending",
          status: "pending",
        });

        const response: ApiResponse = {
          status: "success",
          message: "تم إنشاء الحجز بنجاح، يرجى إكمال عملية الدفع",
          data: booking,
        };
        res.status(201).json(response);
      } else {
        const response: ApiResponse = {
          status: "error",
          message: "طريقة دفع غير صالحة",
        };
        res.status(400).json(response);
      }
    } catch (error) {
      console.error("خطأ في إنشاء الحجز:", error);
      const response: ApiResponse = {
        status: "error",
        message: "فشل في إنشاء الحجز",
        error: error instanceof Error ? error.message : String(error),
      };
      res.status(500).json(response);
    }
  }
);

/**
 * @route   POST /api/webhooks/stripe/course-payments
 * @access  Public (Stripe webhook)
 * @desc    Handle Stripe webhook events for course payments
 */
export const handleStripeWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Stripe webhook secret not configured");
      res.status(500).json({ error: "Webhook secret not configured" });
      return;
    }

    let event;
    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      res.status(400).json({ error: "Webhook signature verification failed" });
      return;
    }

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutSessionCompleted(event.data.object);
          break;
        case "checkout.session.expired":
          await handleCheckoutSessionExpired(event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }
);

// Helper function to handle successful payments
async function handleCheckoutSessionCompleted(session: any) {
  const { metadata } = session;

  if (metadata.bookingType === "in-person-course") {
    const booking = await InPersonCourseBooking.findOneAndUpdate(
      { stripeSessionId: session.id },
      {
        paymentStatus: "paid",
        status: "confirmed",
        paidAt: new Date(),
      },
      { new: true }
    );

    if (booking) {
      console.log(`Payment confirmed for booking: ${booking._id}`);
    } else {
      console.error(`Booking not found for session: ${session.id}`);
    }
  }
}

// Helper function to handle expired sessions
async function handleCheckoutSessionExpired(session: any) {
  const booking = await InPersonCourseBooking.findOneAndUpdate(
    { stripeSessionId: session.id },
    {
      paymentStatus: "failed",
      status: "cancelled",
    },
    { new: true }
  );

  if (booking) {
    console.log(`Session expired for booking: ${booking._id}`);
  }
}

/**
 * @route   GET /api/in-person-courses/verify-payment
 * @access  Private (User)
 * @deprecated Use webhook-based verification instead
 */
export const verifyInPersonCoursePayment = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Input validation
      const validationResult = verifyPaymentSchema.safeParse(req.body);
      if (!validationResult.success) {
        const response: ApiResponse = {
          status: "error",
          message: "بيانات غير صالحة",
          errors: validationResult.error.flatten().fieldErrors,
        };
        res.status(400).json(response);
        return;
      }

      const { session_id } = validationResult.data;
      const userId = req.user!.userId;

      // WARNING: This method is deprecated and should be replaced with webhook verification
      console.warn(
        "Using deprecated client-side payment verification. Use webhooks instead."
      );

      const session = await stripe.checkout.sessions.retrieve(session_id);

      // Verify the session belongs to the current user
      if (session.metadata?.userId !== userId) {
        const response: ApiResponse = {
          status: "error",
          message: "غير مصرح لك بالوصول لهذه الجلسة",
        };
        res.status(403).json(response);
        return;
      }

      if (session.payment_status === "paid") {
        const updatedBooking = await InPersonCourseBooking.findOneAndUpdate(
          {
            stripeSessionId: session_id,
            userId, // Additional security check
          },
          {
            paymentStatus: "paid",
            status: "confirmed",
            paidAt: new Date(),
          },
          { new: true }
        );

        if (!updatedBooking) {
          const response: ApiResponse = {
            status: "error",
            message: "سجل الحجز غير موجود",
          };
          res.status(404).json(response);
          return;
        }

        const response: ApiResponse = {
          status: "success",
          message: "تم تأكيد الدفع بنجاح",
          data: updatedBooking,
        };
        res.status(200).json(response);
      } else {
        const response: ApiResponse = {
          status: "error",
          message: "لم يتم الدفع بعد",
        };
        res.status(400).json(response);
      }
    } catch (error) {
      console.error("خطأ في التحقق من الدفع:", error);
      const response: ApiResponse = {
        status: "error",
        message: "فشل في التحقق من حالة الدفع",
        error: error instanceof Error ? error.message : String(error),
      };
      res.status(500).json(response);
    }
  }
);

/**
 * @route   DELETE /api/in-person-courses/cleanup-expired
 * @access  Private (Admin only)
 * @desc    Clean up expired pending bookings
 */
export const cleanupExpiredBookings = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const result = await InPersonCourseBooking.deleteMany({
        paymentStatus: "pending",
        expiresAt: { $lt: new Date() },
      });

      const response: ApiResponse = {
        status: "success",
        message: `تم حذف ${result.deletedCount} حجز منتهي الصلاحية`,
        data: { deletedCount: result.deletedCount },
      };
      res.status(200).json(response);
    } catch (error) {
      console.error("خطأ في تنظيف الحجوزات المنتهية الصلاحية:", error);
      const response: ApiResponse = {
        status: "error",
        message: "فشل في تنظيف الحجوزات المنتهية الصلاحية",
        error: error instanceof Error ? error.message : String(error),
      };
      res.status(500).json(response);
    }
  }
);

/**
 * @route   GET /api/in-person-courses/bookings/user
 * @access  Private (User)
 * @desc    Get user's bookings with pagination
 */
export const getUserBookings = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const bookings = await InPersonCourseBooking.find({ userId })
        .populate("courseId", "title price")
        .populate("inPersonCourseId", "startDate endDate location")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await InPersonCourseBooking.countDocuments({ userId });

      const response: ApiResponse = {
        status: "success",
        data: {
          bookings,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      };
      res.status(200).json(response);
    } catch (error) {
      console.error("خطأ في جلب حجوزات المستخدم:", error);
      const response: ApiResponse = {
        status: "error",
        message: "فشل في جلب الحجوزات",
        error: error instanceof Error ? error.message : String(error),
      };
      res.status(500).json(response);
    }
  }
);
