import express from "express";
const app = express();
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import eventRoutes from "@/routes/event.routes";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import courseRoutes from "./routes/course.routes";
import recordedCourseRoutes from "./routes/recordedCourse.routes";
import inPersonCourseRoutes from "./routes/inPersonCourse.routes";
import consultationRoutes from "./routes/consultation.routes";
import userRoutes from "./routes/user.routes";
import { apiLimiter } from "./middlewares/rateLimiter";
import contactRoutes from "./routes/contact.routes";
import userContentRoutes from "./routes/userContent.routes";

//? Middleware
app.use(
  cors({
    origin: "http://localhost:5173", //? allow only this origin to send cookies
    credentials: true, //? to allow cookies to be sent with the request
  })
);
app.use(express.json());
app.use(helmet());
app.disable("x-powered-by");
app.use(cookieParser());
app.use("/api/", apiLimiter);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

//* Routes
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/recorded-courses", recordedCourseRoutes);
app.use("/api/in-person-courses", inPersonCourseRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/consultations", consultationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/user-content", userContentRoutes);

export default app;
