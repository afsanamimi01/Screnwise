import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { connectDB } from "./shared/config/db.js";
import { seedIfEmpty } from "./shared/seed.js";
import { errorMiddleware } from "./shared/middleware/error.middleware.js";
import authRoutes from "./auth/routes/auth.routes.js";
import candidateJobsRoutes from "./candidate/routes/jobs.routes.js";
import candidateApplyRoutes from "./candidate/routes/apply.routes.js";
import candidateApplicationsRoutes from "./candidate/routes/applications.routes.js";
import candidateProfileRoutes from "./candidate/routes/profile.routes.js";
import hrJobsRoutes from "./hr/routes/jobs.routes.js";
import hrBoardRoutes from "./hr/routes/board.routes.js";
import hrShortlistRoutes from "./hr/routes/shortlist.routes.js";
import hrUploadRoutes from "./hr/routes/upload.routes.js";
import hrEmailRoutes from "./hr/routes/email.routes.js";
import hrDashboardRoutes from "./hr/routes/dashboard.routes.js";
import companyRoutes from "./company/routes/company.routes.js";
import { paymentRoutes, paymentCallbackRoutes } from "./company/routes/payment.routes.js";
import adminUsersRoutes from "./admin/routes/users.routes.js";
import adminAuditRoutes from "./admin/routes/audit.routes.js";
import adminCompaniesRoutes from "./admin/routes/companies.routes.js";
import adminDashboardRoutes from "./admin/routes/dashboard.routes.js";
import adminRevenueRoutes from "./admin/routes/revenue.routes.js";
import { publicPlansRoutes, adminPlansRoutes } from "./admin/routes/plans.routes.js";
import assistantRoutes from "./assistant/routes/assistant.routes.js";

const app = express();

app.use(cors());
app.use(express.json());
// SSLCommerz posts its callbacks as form data, not JSON.
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/plans", publicPlansRoutes);

app.use("/api/candidate/jobs", candidateJobsRoutes);
app.use("/api/candidate/apply", candidateApplyRoutes);
app.use("/api/candidate/applications", candidateApplicationsRoutes);
app.use("/api/candidate/profile", candidateProfileRoutes);

app.use("/api/hr/jobs", hrJobsRoutes);
app.use("/api/hr/board", hrBoardRoutes);
app.use("/api/hr/shortlist", hrShortlistRoutes);
app.use("/api/hr/upload", hrUploadRoutes);
app.use("/api/hr/email", hrEmailRoutes);
app.use("/api/hr/dashboard", hrDashboardRoutes);

// Ahead of the general company router, so a checkout request is not run
// through that router's middleware chain first.
app.use("/api/company/payments", paymentRoutes);
app.use("/api/company", companyRoutes);
// Public: the payment gateway calls these, so they carry no session and
// validate every transaction against the gateway itself.
app.use("/api/payments", paymentCallbackRoutes);

app.use("/api/assistant", assistantRoutes);

app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/companies", adminCompaniesRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/audit", adminAuditRoutes);
app.use("/api/admin/revenue", adminRevenueRoutes);
app.use("/api/admin/plans", adminPlansRoutes);

app.use(errorMiddleware);

const port = Number(process.env.PORT) || 5000;

let server;

async function start() {
  await connectDB();
  await seedIfEmpty();

  server = app.listen(port, () =>
    console.log(`Screenwise backend listening on http://localhost:${port}`)
  );

  // Without this the EADDRINUSE is an unhandled 'error' event: a stack trace
  // instead of the one line that says what to do about it.
  server.on("error", (err) => {
    if (err.code !== "EADDRINUSE") throw err;
    console.error(
      `Port ${port} is already in use. Run \`npm run free-port\` to stop whatever is holding it, then start again.`
    );
    process.exit(1);
  });
}

// Nodemon restarts and Ctrl+C both land here. Releasing the socket and the
// Mongo connection on the way out is what keeps the port from being held by a
// process that is already on its way to exiting.
let closing = false;
async function shutdown(signal) {
  if (closing) return;
  closing = true;
  console.log(`\n${signal} received - shutting down.`);

  // Never let a wedged connection hold the port hostage.
  const failsafe = setTimeout(() => process.exit(1), 5000);
  failsafe.unref();

  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.connection.close().catch(() => {});
  process.exit(0);
}

for (const signal of ["SIGINT", "SIGTERM", "SIGUSR2", "SIGBREAK"]) {
  process.once(signal, () => shutdown(signal));
}

start();
