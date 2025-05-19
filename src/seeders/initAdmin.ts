import User from "@/models/user.model";
import bcrypt from "bcryptjs";

export const initAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.warn(
      "⚠️ ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping admin creation."
    );
    return;
  }

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) return;

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await User.create({
    fullName: "Super Admin",
    email: adminEmail,
    password: hashedPassword,
    phoneNumber: "0000000000",
    role: "admin",
  });

  console.log("✅ Admin user created");
};
