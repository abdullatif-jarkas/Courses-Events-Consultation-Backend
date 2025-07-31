import { Schema, model } from "mongoose";

const eventSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 1,
  },
  type: {
    type: String,
    enum: ["coffee_meet", "regular"],
    required: true,
    default: "regular",
  },
  seats: {
    type: Number,
    required: true,
    min: 1,
  },
});

const Event = model("Event", eventSchema);

export default Event;
