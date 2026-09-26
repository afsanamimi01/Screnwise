/** Rebuilds the database from shared/seed.js. */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../shared/config/db.js";
import { seedDatabase } from "../shared/seed.js";

try {
  await connectDB();
  await seedDatabase({ reset: true });
  await mongoose.disconnect();
  console.log("Done.");
  process.exit(0);
} catch (err) {
  console.error("Seed failed:", err);
  process.exit(1);
}
