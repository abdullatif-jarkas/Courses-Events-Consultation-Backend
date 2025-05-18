import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_ACCESS_SECRET } from "@/config/config";

declare module "express" {
  interface Request {
    user?: JwtPayload;
  }
}

export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({
      status: "error",
      message: "Unauthorized: No token provided",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({
      status: "error",
      message: "Unauthorized: Invalid token",
    });
  }
};

export default verifyToken;
