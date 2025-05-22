import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Course } from "@/models/courses/course.model";
import { InPersonCourse } from "@/models/courses/inPersonCourse.model";
import { stripe } from "@/utils/stripe";
import { Types } from "mongoose";
import { InPersonCourseBooking } from "@/models/courses/inPersonCourseBooking.model";

/**
 * @route   POST /api/in-person-courses/book/:id
 * @access  Private (User)
 */
export const bookInPersonCourse = asyncHandler(
  async (req: Request, res: Response) => {
    const { paymentMethod, inPersonCourseId } = req.body;

    if (!Types.ObjectId.isValid(inPersonCourseId)) {
      res.status(400).json({
        status: "error",
        message: "معرف الدورة غير صالح",
      });
      return;
    }

    // 1. التحقق من وجود الدورة الحضورية
    const inPersonCourse = await InPersonCourse.findById(inPersonCourseId);
    if (!inPersonCourse) {
      res.status(404).json({
        status: "error",
        message: "الدورة الحضورية غير موجودة",
      });
      return;
    }

    // 2. الحصول على معلومات الدورة
    const course = await Course.findById(inPersonCourse.courseId);
    if (!course) {
      res.status(404).json({
        status: "error",
        message: "معلومات الدورة غير موجودة",
      });
      return;
    }
    // استخدام toString() للحصول على معرفات كسلاسل نصية
    const courseIdStr = (course._id as Types.ObjectId).toString();
    const inPersonCourseIdStr = (
      inPersonCourse._id as Types.ObjectId
    ).toString();

    // 3. التحقق من طريقة الدفع
    if (paymentMethod === "stripe") {
      // إنشاء جلسة دفع Stripe
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "payment",
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: `Course: ${course.title}`,
                },
                unit_amount: course.price * 100, // السعر بالسنت
              },
              quantity: 1,
            },
          ],
          success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&courseId=${courseIdStr}&inPersonCourseId=${inPersonCourseIdStr}`,
          cancel_url: `${process.env.CLIENT_URL}/in-person-courses/${inPersonCourseIdStr}?canceled=true`,
          metadata: {
            courseId: courseIdStr,
            inPersonCourseId: inPersonCourseIdStr,
            userId: req.user!.userId,
          },
          expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // انتهاء الصلاحية بعد 30 دقيقة
        });
        // إنشاء سجل الحجز في قاعدة البيانات (حالة معلقة)
        await InPersonCourseBooking.create({
          userId: req.user!.userId,
          courseId: course._id,
          inPersonCourseId: inPersonCourse._id,
          paymentMethod: "stripe",
          paymentStatus: "pending",
          status: "pending",
          stripeSessionId: session.id,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 دقيقة من الآن
        });

        // إرجاع رابط جلسة الدفع
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
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else if (["external", "cash"].includes(paymentMethod)) {
      // إنشاء حجز بطريقة دفع خارجية أو نقدية
      const booking = await InPersonCourseBooking.create({
        userId: req.user!.userId,
        courseId: course._id,
        inPersonCourseId: inPersonCourse._id,
        paymentMethod,
        paymentStatus: "pending",
        status: "pending",
      });

      res.status(201).json({
        status: "success",
        message: "تم إنشاء الحجز بنجاح، يرجى إكمال عملية الدفع",
        data: booking,
      });
    } else {
      res.status(400).json({
        status: "error",
        message: "طريقة دفع غير صالحة",
      });
    }
  }
);

/**
 * @route   GET /api/in-person-courses/verify-payment
 * @access  Private (User)
 */
export const verifyInPersonCoursePayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { session_id } = req.body;

    if (!session_id || typeof session_id !== "string") {
      res.status(400).json({
        status: "error",
        message: "معرف الجلسة مطلوب",
      });
      return;
    }

    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (session.payment_status === "paid") {
        const updatedBooking = await InPersonCourseBooking.findOneAndUpdate(
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

        res.status(200).json({
          status: "success",
          message: "تم تأكيد الدفع بنجاح",
          booking: updatedBooking,
        });
        return;
      }

      res.status(400).json({
        status: "error",
        message: "لم يتم الدفع بعد",
      });
    } catch (error) {
      console.error("خطأ في التحقق من الدفع:", error);
      res.status(500).json({
        status: "error",
        message: "فشل في التحقق من حالة الدفع",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

// باقي الكود يبقى كما هو...
