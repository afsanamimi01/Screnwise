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
import hrJobsRoutes from "./hr/routes/jobs.routes.js";
import hrBoardRoutes from "./hr/routes/board.routes.js";
import hrShortlistRoutes from "./hr/routes/shortlist.routes.js";
import hrUploadRoutes from "./hr/routes/upload.routes.js";
import hrEmailRoutes from "./hr/routes/email.routes.js";
import hrDashboardRoutes from "./hr/routes/dashboard.routes.js";
import companyRoutes from "./company/routes/company.routes.js";
import adminUsersRoutes from "./admin/routes/users.routes.js";
import adminAuditRoutes from "./admin/routes/audit.routes.js";
import adminCompaniesRoutes from "./admin/routes/companies.routes.js";
import adminDashboardRoutes from "./admin/routes/dashboard.routes.js";
import { publicPlansRoutes, adminPlansRoutes } from "./admin/routes/plans.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/plans", publicPlansRoutes);

app.use("/api/candidate/jobs", candidateJobsRoutes);
app.use("/api/candidate/apply", candidateApplyRoutes);
app.use("/api/candidate/applications", candidateApplicationsRoutes);

app.use("/api/hr/jobs", hrJobsRoutes);
app.use("/api/hr/board", hrBoardRoutes);
app.use("/api/hr/shortlist", hrShortlistRoutes);
app.use("/api/hr/upload", hrUploadRoutes);
app.use("/api/hr/email", hrEmailRoutes);
app.use("/api/hr/dashboard", hrDashboardRoutes);

app.use("/api/company", companyRoutes);

app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/companies", adminCompaniesRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/audit", adminAuditRoutes);
app.use("/api/admin/plans", adminPlansRoutes);

app.use(errorMiddleware);

const port = process.env.PORT || 5000;

async function start() {
  await connectDB();
  await seedIfEmpty();
  app.listen(port, () => console.log(`Screenwise backend listening on http://localhost:${port}`));
}

start();
