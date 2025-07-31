import express from "express";
import { sendContactForm } from "@/controllers/Contact/contact.controller";

const contactRoutes = express.Router();

contactRoutes.post("/", sendContactForm);

export default contactRoutes;