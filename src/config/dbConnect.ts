import app from "@/app";
import { initAdmin } from "@/seeders/initAdmin";
import mongoose from "mongoose";

const dbConnect = async () => {
  try {
    const connect = await mongoose.connect(process.env.MONGO_URI as string);
    console.log(
      `MongoDB Connected: ${connect.connection.host}, ${connect.connection.name}`
    );
    //? Run admin seeder only in dev/test mode AND when INIT_ADMIN is enabled
    if (
      process.env.NODE_ENV !== "production" &&
      process.env.INIT_ADMIN === "true"
    ) {
      await initAdmin();
    }
    app.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port ${process.env.PORT || 5000}`)
    );
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default dbConnect;
