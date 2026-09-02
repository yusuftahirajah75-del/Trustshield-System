const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/apiResponse");
const billingService = require("../services/billingService");

const getPlans = asyncHandler(async (req, res) => {
  const plans = await billingService.getPlans();
  return successResponse(res, 200, "Available subscription plans retrieved.", { plans });
});

const getSubscription = asyncHandler(async (req, res) => {
  const summary = await billingService.getSubscriptionSummary(req.user.id);
  return successResponse(res, 200, "Subscription summary retrieved.", summary);
});

const checkout = asyncHandler(async (req, res) => {
  const { planSlug, callbackUrl } = req.body;
  const result = await billingService.initializeCheckout({
    userId: req.user.id,
    planSlug,
    callbackUrl
  });

  return successResponse(res, 200, "Checkout initialized successfully.", result);
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.params;
  const result = await billingService.verifyPayment(reference);
  return successResponse(res, 200, "Payment verified successfully.", result);
});

const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-paystack-signature"];
  const rawBody = req.rawBody;

  const result = await billingService.handleWebhook({
    providerName: "paystack",
    signature,
    rawBody,
    payload: req.body
  });

  return res.status(200).json({
    status: "success",
    message: "Webhook processed successfully.",
    data: result
  });
});

const cancelSubscription = asyncHandler(async (req, res) => {
  const result = await billingService.cancelSubscription(req.user.id);
  return successResponse(
    res,
    200,
    "Subscription marked for cancellation at period end.",
    { subscription: result }
  );
});

module.exports = {
  getPlans,
  getSubscription,
  checkout,
  verifyPayment,
  handleWebhook,
  cancelSubscription
};
