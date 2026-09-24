/**
 * Touches the database so Atlas's M0 free-tier "pause after 30 days idle"
 * timer never fires. A real read against a real collection - not just an
 * open connection - is what Atlas counts as activity.
 *
 *   npm run keepalive
 *
 * Run on a schedule (see .github/workflows/mongodb-keepalive.yml) so the
 * cluster stays up even when nobody is running the app locally.
 */
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
