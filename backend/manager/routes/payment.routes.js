import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import {
  getPaymentStatus,
  listPayments,
  paymentCancel,
  paymentFail,
  paymentIpn,
  paymentSuccess,
  startPayment,
} from "../controllers/payment.controller.js";

/** Manager-facing checkout, mounted under /api/manager/payments. */
export const paymentRoutes = Router();

paymentRoutes.use(verifyToken, requireRole("manager"));
// No `requireActivePlan` here: paying is precisely how a company without a
// plan gets one.
paymentRoutes.get("/status", getPaymentStatus);
paymentRoutes.get("/", listPayments);
paymentRoutes.post("/", startPayment);

/** Gateway callbacks, mounted publicly under /api/payments. */
export const paymentCallbackRoutes = Router();

paymentCallbackRoutes.post("/success", paymentSuccess);
paymentCallbackRoutes.get("/success", paymentSuccess);
paymentCallbackRoutes.post("/fail", paymentFail);
paymentCallbackRoutes.get("/fail", paymentFail);
paymentCallbackRoutes.post("/cancel", paymentCancel);
paymentCallbackRoutes.get("/cancel", paymentCancel);
paymentCallbackRoutes.post("/ipn", paymentIpn);
