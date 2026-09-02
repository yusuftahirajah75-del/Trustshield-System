const express = require("express");
const authenticate = require("../middlewares/authenticate");
const validate = require("../middlewares/validate");
const {
  checkoutSchema,
  verifyPaymentParamsSchema
} = require("../validators/billingValidator");
const {
  getPlans,
  getSubscription,
  checkout,
  verifyPayment,
  handleWebhook,
  cancelSubscription
} = require("../controllers/billingController");

const router = express.Router();

// Public: available plans
router.get("/plans", getPlans);

// Public / Provider-facing: Webhook endpoint (verified cryptographically)
router.post("/webhook", handleWebhook);

// Authenticated session routes
router.get("/subscription", authenticate, getSubscription);
router.post("/checkout", authenticate, validate(checkoutSchema), checkout);
router.get("/verify/:reference", authenticate, validate(verifyPaymentParamsSchema, "params"), verifyPayment);
router.post("/subscription/cancel", authenticate, cancelSubscription);

module.exports = router;
