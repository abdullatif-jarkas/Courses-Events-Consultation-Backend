import express from "express";
import { sendContactForm } from "@/controllers/contact.controller";

const contactRoutes = express.Router();

// مسار إرسال نموذج الاتصال
contactRoutes.post("/", sendContactForm);

export default contactRoutes;