import express from "express";
import { sendContactForm } from "@/controllers/contact.controller";

const contactRoutes = express.Router();

contactRoutes.post("/", sendContactForm);

export default contactRoutes;