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

/**
 * Manager-facing checkout: starting a payment and reading your own history.
 * Mounted under /api/company/payments.
 */
export const paymentRoutes = Router();

paymentRoutes.use(verifyToken, requireRole("manager"));
// No `requireActivePlan` here: paying is precisely how a company without a
// plan gets one.
paymentRoutes.get("/status", getPaymentStatus);
paymentRoutes.get("/", listPayments);
paymentRoutes.post("/", startPayment);

/**
 * Gateway callbacks, mounted publicly under /api/payments.
 *
 * SSLCommerz cannot present our JWT, so these carry no session at all - which
 * is why every one of them re-checks the transaction against the gateway's
 * validation API before anything is granted. They are POSTed as form data;
 * `success` and `fail` also accept GET, because a customer can land back on
 * them by using the browser's back button.
 */
export const paymentCallbackRoutes = Router();

paymentCallbackRoutes.post("/success", paymentSuccess);
paymentCallbackRoutes.get("/success", paymentSuccess);
paymentCallbackRoutes.post("/fail", paymentFail);
paymentCallbackRoutes.get("/fail", paymentFail);
paymentCallbackRoutes.post("/cancel", paymentCancel);
paymentCallbackRoutes.get("/cancel", paymentCancel);
paymentCallbackRoutes.post("/ipn", paymentIpn);
