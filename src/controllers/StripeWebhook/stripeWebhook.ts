import { Request, Response } from "express";
import Stripe from "stripe";
import asyncHandler from "express-async-handler";
import { EventRegistration } from "@/models/Event/eventRegistration.model";
import { stripe } from "@/utils/stripe";

export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"]!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("⚠️ Webhook signature verification failed.", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  //? التعرف على نوع الحدث
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    //? تأكد من وجود userId و eventId
    if (!metadata?.userId || !metadata?.eventId) {
      console.warn("⚠️ Metadata missing userId or eventId");
      res.status(400).json({ message: "Missing metadata" });
      return;
    }

    try {
      //? تحقق أن المستخدم لم يُسجل من قبل (تفادي التكرار في حالة فشل الويب هوك ثم إعادة إرساله)
      const alreadyRegistered = await EventRegistration.findOne({
        user: metadata.userId,
        event: metadata.eventId,
      });

      if (alreadyRegistered) {
        console.log("🔁 User already registered.");
        res.status(200).json({ message: "Already registered" });
        return;
      }

      //* إنشاء التسجيل في الفعالية
      await EventRegistration.create({
        user: metadata.userId,
        event: metadata.eventId,
        projectName: metadata.projectName || undefined,
        projectLink: metadata.projectLink || undefined,
        paid: true, // إذا كنت تحتفظ بحالة الدفع
      });

      console.log("✅ User registered to event:", metadata.eventId);
      res.status(200).json({ message: "Registration completed" });

    } catch (err) {
      console.error("❌ Error registering to event:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  } else {
    //^ أنواع أخرى من الأحداث يمكن تجاهلها حاليًا
    res.status(200).json({ message: "Unhandled event type" });
  }
});
