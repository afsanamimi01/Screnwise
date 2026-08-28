/**
 * Rebuilds the database from `shared/seed.js` — clears every collection, then
 * inserts the full demo dataset (users for every role, jobs, applications
 * across the whole pipeline, sent emails and an audit history).
 *
 *   npm run seed
 */
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
