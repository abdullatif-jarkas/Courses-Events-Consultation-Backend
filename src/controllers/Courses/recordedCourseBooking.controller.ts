import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Course } from "@/models/courses/course.model";
import { RecordedCourse } from "@/models/courses/recordedCourse.model";
import { stripe } from "@/utils/stripe";
import { RecordedCourseBooking } from "@/models/recordedCourseBooking.model";
import { Types } from "mongoose";

// @desc Create Stripe session & booking
// @route POST /api/recorded-course-bookings
// @access Private
export const createRecordedCourseBooking = asyncHandler(
  async (req: Request, res: Response) => {
    const { courseId } = req.body;

    if (!req.user || !req.user.userId) {
      res.status(401);
      throw new Error("User not authenticated");
    }

    const userId = req.user.userId;

    const course = await Course.findById(courseId);
    if (!course || course.type !== "recorded" || !course.recordedCourse) {
      res.status(404);
      throw new Error("Recorded course not found");
    }

    const recordedCourse = await RecordedCourse.findById(course.recordedCourse);
    if (!recordedCourse) {
      res.status(404);
      throw new Error("Recorded course data missing");
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment-cancel`,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: course.title,
              description: course.description,
            },
            unit_amount: course.price * 100, // تحويل إلى سنتات
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId.toString(),
        courseId: (course._id as Types.ObjectId).toString(),
        recordedCourseId: (recordedCourse._id as Types.ObjectId).toString(),
      },
    });

    // Save booking with status pending
    await RecordedCourseBooking.create({
      userId,
      courseId,
      recordedCourseId: recordedCourse._id,
      sessionId: session.id,
      paymentStatus: "pending",
    });

    res.status(200).json({
      message: "Checkout session created",
      sessionUrl: session.url,
    });
  }
);

// @desc Verify Stripe payment session for recorded course
// @route POST /api/recorded-course-bookings/verify-payment
// @access Private
export const verifyRecordedCoursePayment = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    res.status(400);
    throw new Error("Session ID is required");
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    res.status(400);
    throw new Error("Payment not completed");
  }

  const booking = await RecordedCourseBooking.findOne({ sessionId });

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found");
  }

  if (booking.paymentStatus === "paid") {
    res.status(200).json({ message: "Payment already verified" });
    return;
  }

  booking.paymentStatus = "paid";
  await booking.save();

  res.status(200).json({ message: "Payment verified successfully" });
});
