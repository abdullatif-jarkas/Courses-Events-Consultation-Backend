import { Response } from "express";

export const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production", // آمن فقط في الإنتاج
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 أيام
  });
};
