/** Touches the DB so Atlas's free-tier pause timer never fires. */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../shared/config/db.js";
import User from "../shared/models/User.model.js";

try {
  await connectDB();
  const count = await User.estimatedDocumentCount();
  await mongoose.disconnect();
  console.log(`Keep-alive OK at ${new Date().toISOString()} - ${count} users.`);
  process.exit(0);
} catch (err) {
  console.error("Keep-alive ping failed:", err);
  process.exit(1);
}
