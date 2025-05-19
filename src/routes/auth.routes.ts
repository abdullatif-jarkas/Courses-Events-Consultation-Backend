import { Router } from "express";
const authRouter = Router();
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
} from "@/controllers/Auth/auth.controller";
import { loginLimiter } from "@/middlewares/rateLimiter";

authRouter.post("/register", register);
authRouter.post("/login", loginLimiter, login);
authRouter.post("/logout", logout);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password", resetPassword);
authRouter.post("/refresh-token", refreshToken);
export default authRouter;
