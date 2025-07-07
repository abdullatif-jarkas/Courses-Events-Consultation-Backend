import express from "express";
import verifyToken from "@/middlewares/auth.middleware";
import { getUserContent } from "@/controllers/Users/userContent.controller";

const userContentRoutes = express.Router();

// جميع المسارات محمية بواسطة middleware التحقق من الرمز
userContentRoutes.use(verifyToken);

// مسار واحد للحصول على جميع محتويات المستخدم
userContentRoutes.get("/", getUserContent);

export default userContentRoutes;
