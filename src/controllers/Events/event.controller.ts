import Event from "@/models/Event/event.model";
import { EventRegistration } from "@/models/Event/eventRegistration.model";
import { stripe } from "@/utils/stripe";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

/**
 * @route   POST /api/events
 * @access  Private (Admin only)
 */
export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, date, location, seats, type, price } = req.body;

  if (
    !name ||
    !description ||
    !date ||
    !location ||
    !seats ||
    !type ||
    !price
  ) {
    res.status(400).json({
      status: "error",
      message:
        "All fields (name, description, date, location, seats, type, price) are required.",
    });
    return;
  }

  const validTypes = ["regular", "coffee_meet"];
  if (!validTypes.includes(type)) {
    res.status(400).json({
      status: "error",
      message: "Invalid event type. Must be either 'regular' or 'coffee_meet'.",
    });
    return;
  }

  const event = await Event.create({
    name,
    description,
    date,
    location,
    seats,
    type,
    price,
  });

  res.status(201).json({
    status: "success",
    data: event,
  });
});

/**
 * @returns {Promise<void>}
 * @route GET /api/events
 * @access Public (everyone)
 */

export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  const events = await Event.find();

  res.status(200).json({
    status: "success",
    data: events,
  });
});

/**
 * @param {string} id
 * @returns {Promise<void>}
 * @route GET /api/events/:id
 * @access Public (everyone)
 */

export const getEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    res.status(404).json({
      status: "error",
      message: "Event not found",
    });
    return;
  }

  res.status(200).json({
    status: "success",
    data: event,
  });
});

/**
 * @param {string} id
 * @param {string} name
 * @param {string} description
 * @param {string} date
 * @param {string} location
 * @returns {Promise<void>}
 * @route PUT /api/events/:id
 * @access Private (admin only)
 */

export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!event) {
    res.status(404).json({
      status: "error",
      message: "Event not found",
    });
    return;
  }

  res.status(200).json({
    status: "success",
    data: event,
  });
});

/**
 * @param {string} id
 * @returns {Promise<void>}
 * @route DELETE /api/events/:id
 * @access Private (admin only)
 */

export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await Event.findByIdAndDelete(req.params.id);

  if (!event) {
    res.status(404).json({
      status: "error",
      message: "Event not found",
    });
    return;
  }

  res.status(200).json({
    status: "success",
    message: "Event deleted successfully",
  });
});

/**
 * @route   POST /api/events/:eventId/register
 * @access  Private (User)
 * @desc    Initiate Stripe checkout session
 */
export const registerToEvent = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req.user as { _id: string })._id;
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ status: "error", message: "Event not found." });
      return;
    }

    // التأكد من المقاعد
    const registrationsCount = await EventRegistration.countDocuments({
      event: eventId,
    });
    if (registrationsCount >= event.seats) {
      res.status(400).json({ status: "error", message: "Event is full." });
      return;
    }

    // تحقق من التسجيل المسبق
    const alreadyRegistered = await EventRegistration.findOne({
      user: userId,
      event: eventId,
    });
    if (alreadyRegistered) {
      res
        .status(400)
        .json({ status: "error", message: "You are already registered." });
      return;
    }

    // متغيرات خاصة بفنجان قهوة (يتم قراءتها فقط إذا كانت الفعالية من هذا النوع)
    let projectName = "";
    let projectLink = "";

    if (event.type === "coffee_meet") {
      ({ projectName, projectLink } = req.body || {});

      if (!projectName || !projectLink) {
        res.status(400).json({
          status: "error",
          message:
            "projectName and projectLink are required for coffee_meet events.",
        });
        return;
      }
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: req.user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Registration for event: ${event.name}`,
              description: event.description,
            },
            unit_amount: event.price * 100,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: String(userId),
        eventId: String(eventId),
        projectName: String(projectName),
        projectLink: String(projectLink),
      },
      success_url: `${process.env.CLIENT_URL}/events/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/events/${eventId}`,
    });

    res.status(200).json({ status: "success", url: session.url });
  }
);
