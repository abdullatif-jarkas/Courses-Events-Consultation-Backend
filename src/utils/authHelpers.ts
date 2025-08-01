import { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } from "@/config/config";
import jwt from "jsonwebtoken";

export function generateOTP(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

export function generateExpiryMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}


export const generateAccessToken = (userId: string, role: string) => {
  return jwt.sign({ userId, role }, JWT_ACCESS_SECRET, { expiresIn: "1h" });
};

export const generateRefreshToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
};
