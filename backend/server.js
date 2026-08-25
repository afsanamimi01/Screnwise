import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./shared/config/db.js";
import { seedIfEmpty } from "./shared/seed.js";
import { errorMiddleware } from "./shared/middleware/error.middleware.js";
import authRoutes from "./auth/routes/auth.routes.js";
import candidateJobsRoutes from "./candidate/routes/jobs.routes.js";
import candidateApplyRoutes from "./candidate/routes/apply.routes.js";
import candidateApplicationsRoutes from "./candidate/routes/applications.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/candidate/jobs", candidateJobsRoutes);
app.use("/api/candidate/apply", candidateApplyRoutes);
app.use("/api/candidate/applications", candidateApplicationsRoutes);

app.use(errorMiddleware);

const port = process.env.PORT || 5000;

async function start() {
  await connectDB();
  await seedIfEmpty();
  app.listen(port, () => console.log(`ScanWise backend listening on http://localhost:${port}`));
}

start();
