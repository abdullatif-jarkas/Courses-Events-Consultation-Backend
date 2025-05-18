import dotenv from "dotenv";
dotenv.config();

if (!process.env.JWT_ACCESS_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

export const JWT_ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET!;
export const JWT_REFRESH_SECRET  = process.env.JWT_REFRESH_SECRET!;

console.log(JWT_ACCESS_SECRET)
console.log(JWT_REFRESH_SECRET)