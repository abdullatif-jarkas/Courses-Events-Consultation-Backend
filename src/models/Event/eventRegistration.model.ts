import mongoose from "mongoose";

const eventRegistrationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    projectName: {
      type: String,
    },
    projectLink: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const EventRegistration = mongoose.model(
  "EventRegistration",
  eventRegistrationSchema
);
