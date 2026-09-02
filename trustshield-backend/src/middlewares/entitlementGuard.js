const entitlementService = require("../services/entitlementService");

/**
 * Entitlement Guard Middleware
 *
 * Enforces monthly request quotas based on user plan entitlements.
 * If quota is exhausted, halts request execution and returns HTTP 402 Payment Required.
 */
const entitlementGuard = async (req, res, next) => {
  const userId = req.user?.id || req.apiKey?.user_id;

  if (!userId) {
    // If no user context exists, pass through and let downstream auth fail or handle
    return next();
  }

  try {
    const allowance = await entitlementService.checkQuotaAllowance(userId);

    if (!allowance.allowed) {
      return res.status(402).json({
        success: false,
        error: "MONTHLY_LIMIT_REACHED",
        message: "Your monthly TrustShield limit has been reached. Please upgrade your plan to continue performing trust verifications.",
        upgradeRequired: true,
        quota: {
          plan: allowance.plan,
          planName: allowance.planName,
          monthlyLimit: allowance.monthlyLimit,
          used: allowance.used,
          remaining: allowance.remaining
        }
      });
    }

    req.entitlements = allowance;
    next();
  } catch (err) {
    console.error("Entitlement check error:", err);
    // On unexpected entitlement check failure, log and proceed so we don't block valid paying traffic unnecessarily
    next();
  }
};

module.exports = entitlementGuard;
