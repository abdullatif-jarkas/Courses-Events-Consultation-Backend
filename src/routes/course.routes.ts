import {
  getAllCourses,
  getCourseById,
} from "@/controllers/Courses/courses.controller";
import { Router } from "express";

const courseRoutes = Router();

courseRoutes.get("/", getAllCourses);
courseRoutes.get("/:id", getCourseById);

export default courseRoutes;
