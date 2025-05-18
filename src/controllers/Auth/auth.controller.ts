import User from "@/models/user.model";
import { Request, RequestHandler, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { IUser } from "@/types/user";
import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  forgotPasswordSchema,
} from "@/validators/userSchema";
import { JWT_REFRESH_SECRET } from "@/config/config";
import asyncHandler from "express-async-handler";
import { sendEmail } from "@/utils/sendEmail";
import {
  generateAccessToken,
  generateExpiryMinutes,
  generateOTP,
  generateRefreshToken,
} from "@/utils/authHelpers";

/** @description Register
 * @param {string} fullName
 * @param {string} email
 * @param {string} password
 * @param {string} role
 * @returns {Promise<void>}
 * @route POST /api/auth/register
 */

export const register = asyncHandler(async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      status: "error",
      message: "Invalid input data",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { fullName, email, password, phoneNumber } = parsed.data;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(409).json({
      status: "error",
      message: "Email is already registered",
    });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user: IUser = await User.create({
    fullName,
    email,
    password: hashedPassword,
    phoneNumber,
    role: "user",
  });

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 15 * 60 * 1000, //? 15 Minutes
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, //? 7 Days
  });

  res.status(201).json({
    status: "success",
    data: {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    },
  });
});

/** @description Login
 * @param {string} email
 * @param {string} password
 * @returns {Promise<void>}
 * @route POST /api/auth/login
 */

export const login: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      status: "error",
      message: "Invalid input data",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { email, password } = parsed.data;
  const user = await User.findOne({ email });

  if (!user) {
    res.status(404).json({
      status: "error",
      message: "User not found",
    });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password as string);
  if (!isPasswordValid) {
    res.status(401).json({
      status: "error",
      message: "Invalid credentials",
    });
    return;
  }

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  setRefreshTokenCookie(res, refreshToken);

  res.status(200).json({
    status: "success",
    message: "Logged in successfully",
    data: {
      accessToken,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    },
  });
});

/** @description Refresh token
 * @returns {Promise<void>}
 * @route POST /api/auth/refresh-token
 */

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    res.status(401).json({ status: "error", message: "No refresh token" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId);

    if (!user) {
      res.status(401).json({ status: "error", message: "User not found" });
      return;
    }

    const newAccessToken = generateAccessToken(user._id, user.role);

    res.status(200).json({
      status: "success",
      message: "Access token refreshed",
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (err) {
    res.status(403).json({ status: "error", message: "Invalid refresh token" });
  }
});

/** @description Logout
 * @returns {Promise<void>}
 * @route POST /api/auth/logout
 */

export const logout = asyncHandler(async (req: Request, res: Response) => {
  res.clearCookie("token", { path: "/" });
  res.clearCookie("accessToken", { path: "/" });
  res.clearCookie("refreshToken", { path: "/" });
  res
    .status(200)
    .json({ status: "success", message: "Logged out successfully" });
});

/** @description Forgot password
 * @param {string} email
 * @returns {Promise<void>}
 * @route POST /api/auth/forgot-password
 */

import crypto from "crypto";
import { setRefreshTokenCookie } from "@/utils/setRefreshTokenCookie";

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: "error",
        message: "Invalid input data",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { email } = parsed.data;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({
        status: "error",
        message: "User not found",
      });
      return;
    }

    const resetCode = crypto.randomBytes(32).toString("hex");
    const expiryDate = new Date(Date.now() + 1000 * 60 * 10); // 10 minutes

    user.resetCode = resetCode;
    user.resetCodeExpires = expiryDate;
    await user.save();

    const resetLink = `http://localhost:5173/reset-password?code=${resetCode}`;

    await sendEmail(
      email,
      "Reset Your Password",
      `
      <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              background-color: #f4f4f9;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }
            .header {
              background-color: #4CAF50;
              color: white;
              padding: 10px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              padding: 20px;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              color: #777;
              margin-top: 20px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              margin-top: 15px;
              background-color: #4CAF50;
              color: white;
              text-decoration: none;
              border-radius: 5px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Password Reset Request</h2>
            </div>
            <div class="content">
              <p>Hi there,</p>
              <p>We received a request to reset your password. Click the button below to proceed:</p>
              <a class="button" href="${resetLink}">Reset Password</a>
              <p>This link will expire in 10 minutes.</p>
              <p>If you didn't request a password reset, you can safely ignore this email.</p>
              <p>Best regards,<br>Your Team</p>
            </div>
            <div class="footer">
              <p>For any issues, please contact support.</p>
            </div>
          </div>
        </body>
      </html>
      `
    );

    res.status(200).json({
      status: "success",
      message: "Reset link sent to email",
    });
  }
);

/** @description Reset password
 * @param {string} token
 * @param {string} newPassword
 * @returns {Promise<void>}
 * @route POST /api/auth/reset-password
 */

export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: "error",
        message: "Invalid input data",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { resetCode, password, confirmPassword } = parsed.data;

    if (password !== confirmPassword) {
      res.status(400).json({
        status: "error",
        message: "Passwords do not match.",
      });
      return;
    }

    const user = await User.findOne({ resetCode });
    if (!user || !user.resetCodeExpires) {
      res.status(400).json({
        status: "error",
        message: "Invalid or expired reset code.",
      });
      return;
    }

    const isCodeValid = user.resetCodeExpires > new Date();
    if (!isCodeValid) {
      res.status(400).json({
        status: "error",
        message: "Reset code has expired.",
      });
      return;
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetCode = undefined;
    user.resetCodeExpires = undefined;
    await user.save();

    res.status(200).json({
      status: "success",
      message: "Password successfully updated.",
    });
  }
);



