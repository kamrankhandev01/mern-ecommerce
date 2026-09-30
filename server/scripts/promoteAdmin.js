import "dotenv/config";
import mongoose from "mongoose";
import userModel from "../models/userModel.js";

const email = process.argv[2]?.trim();

if (!email) {
  console.error("Usage: npm run admin:promote -- <existing-user-email>");
  process.exitCode = 1;
} else {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await userModel.findOne({ email });
    if (!user) {
      throw new Error("No account found for that email address.");
    }

    user.role = "admin";
    await user.save();
    console.log(
      `Admin access enabled for ${user.email}. Sign out and sign back in to refresh your session.`,
    );
  } catch (error) {
    console.error(error.message || "Could not grant admin access.");
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
