import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "@/models/user.model";

/** @description Update user
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 * @route PUT /api/users/me
 */

export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.userId;

  const { fullName, phoneNumber, email } = req.body;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { fullName, phoneNumber, email },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/** @description Update user password
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 * @route PUT /api/users/me/password
 */

export const updateUserPassword = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await User.findById(userId).select("+password");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      res.status(400).json({ message: "Incorrect old password" });
      return;
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

/** @description Get current user profile
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 * @route GET /api/users/me
 */
export const getMe = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  try {
    const user = await User.findById(userId).select("-password");
    
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/** 
 * @description Get all users
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 * @route GET /api/users
 * @access Private (Admin only)
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().select("-password");
    
    res.status(200).json({
      status: "success",
      count: users.length,
      data: users
    });
  } catch (err) {
    res.status(500).json({ 
      status: "error",
      message: "Server error" 
    });
  }
};

/** 
 * @description Delete a user
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 * @route DELETE /api/users/:id
 * @access Private (Admin only)
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      res.status(404).json({ 
        status: "error",
        message: "User not found" 
      });
      return;
    }

    // Prevent deleting admin users
    if (user.role === "admin") {
      res.status(403).json({ 
        status: "error",
        message: "Cannot delete admin users" 
      });
      return;
    }

    await User.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ 
      status: "success",
      message: "User deleted successfully" 
    });
  } catch (err) {
    res.status(500).json({ 
      status: "error",
      message: "Server error" 
    });
  }
};
