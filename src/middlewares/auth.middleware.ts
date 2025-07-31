import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_ACCESS_SECRET } from "@/config/config";
import User from "@/models/user.model";

declare module "express" {
  interface Request {
    user?: any;
  }
}

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies?.accessToken;
  if (!token) {
    res.status(401).json({
      status: "error",
      message: "Unauthorized: No access token provided",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as JwtPayload;
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({
        status: "error",
        message: "Unauthorized: User not found",
      });
      return;
    }

    req.user = user;

    next();
  } catch (err) {
    res.status(401).json({
      status: "error",
      message: "Unauthorized: Invalid or expired token",
    });
    return;
  }
};

export default verifyToken;
