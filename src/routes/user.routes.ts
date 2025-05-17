import express from "express";
import verifyToken from "@/middlewares/auth.middleware";
import { authorizeRoles } from "@/middlewares/role.middleware";
import { 
  getMe, 
  updateUser, 
  updateUserPassword, 
  getAllUsers,
  deleteUser
} from "@/controllers/Users/users.controller";

const userRouter = express.Router();

//^ User routes
userRouter.get("/me", verifyToken, getMe);
userRouter.put("/me", verifyToken, updateUser);
userRouter.put("/me/password", verifyToken, updateUserPassword);

//* Admin routes
userRouter.get("/", verifyToken, authorizeRoles("admin"), getAllUsers);
userRouter.delete("/:id", verifyToken, authorizeRoles("admin"), deleteUser);

export default userRouter;
