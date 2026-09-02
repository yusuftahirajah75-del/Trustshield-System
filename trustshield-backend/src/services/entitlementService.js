const billingRepository = require("../repositories/billingRepository");

/**
 * Computes the complete digital trust entitlement profile for a given user
 */
const getUserEntitlements = async (userId) => {
  if (!userId) {
    // Guest or unauthenticated requests get zero paid quota
    const freePlan = await billingRepository.findPlanBySlug("free");
    return {
      plan: "free",
      planName: freePlan?.name || "Free",
      monthlyLimit: freePlan?.monthly_request_limit || 500,
      used: 0,
      remaining: freePlan?.monthly_request_limit || 500,
      percentage: 0,
      rateLimitPerMinute: freePlan?.rate_limit_per_minute || 60,
      features: freePlan?.features || [],
      status: "free",
      renewalDate: null,
      cancelAtPeriodEnd: false
    };
  }

  // 1. Fetch user's active subscription
  const activeSub = await billingRepository.findActiveSubscriptionByUser(userId);
  let plan = null;
  let periodStart = null;
  let renewalDate = null;
  let status = "active";
  let cancelAtPeriodEnd = false;

  const now = new Date();

  if (activeSub && new Date(activeSub.current_period_end) > now) {
    // User has a valid active paid subscription
    plan = {
      id: activeSub.plan_id,
      name: activeSub.plan_name,
      slug: activeSub.plan_slug,
      price: activeSub.plan_price,
      currency: activeSub.plan_currency,
      monthly_request_limit: activeSub.monthly_request_limit,
      rate_limit_per_minute: activeSub.rate_limit_per_minute,
      features: activeSub.plan_features
    };
    periodStart = new Date(activeSub.current_period_start);
    renewalDate = activeSub.current_period_end;
    status = activeSub.status;
    cancelAtPeriodEnd = Boolean(activeSub.cancel_at_period_end);
  } else {
    // Default to the Free tier plan
    const freePlan = await billingRepository.findPlanBySlug("free");
    plan = freePlan;
    // For free tier, billing period defaults to the start of the current month
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    status = activeSub ? "expired" : "active";
  }

  // 2. Aggregate requests executed by user in this period from api_usage_logs
  const used = await billingRepository.countUserRequestsInPeriod(userId, periodStart);
  const monthlyLimit = plan?.monthly_request_limit || 500;
  const remaining = Math.max(0, monthlyLimit - used);
  const percentage = monthlyLimit > 0 ? Number(((used / monthlyLimit) * 100).toFixed(1)) : 0;
  const rateLimitPerMinute = plan?.rate_limit_per_minute || 60;

  return {
    plan: plan?.slug || "free",
    planId: plan?.id || null,
    planName: plan?.name || "Free",
    price: plan?.price || "0.00",
    currency: plan?.currency || "USD",
    monthlyLimit,
    used,
    remaining,
    percentage: Math.min(100, percentage),
    rateLimitPerMinute,
    features: plan?.features || [],
    status,
    renewalDate,
    cancelAtPeriodEnd
  };
};

/**
 * Checks if the user is allowed to perform a paid/metered trust check
 */
const checkQuotaAllowance = async (userId) => {
  const entitlements = await getUserEntitlements(userId);
  return {
    allowed: entitlements.remaining > 0,
    remaining: entitlements.remaining,
    monthlyLimit: entitlements.monthlyLimit,
    used: entitlements.used,
    plan: entitlements.plan,
    planName: entitlements.planName,
    rateLimitPerMinute: entitlements.rateLimitPerMinute
  };
};

module.exports = {
  getUserEntitlements,
  checkQuotaAllowance
};
