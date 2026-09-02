const billingRepository = require("../repositories/billingRepository");
const ApiError = require("../utils/apiError");

/**
 * Activates or upgrades a subscription for a user upon successful payment
 */
const activateSubscription = async ({
  userId,
  planId,
  provider = "paystack",
  providerCustomerId = null,
  providerSubscriptionId = null,
  periodDays = 30
}) => {
  const currentPeriodStart = new Date();
  const currentPeriodEnd = new Date(
    Date.now() + periodDays * 24 * 60 * 60 * 1000
  );

  // Check if user already has an existing subscription
  const existingSub = await billingRepository.findActiveSubscriptionByUser(userId);

  if (existingSub) {
    // Update existing subscription to active with new plan and renewed period
    const updated = await billingRepository.updateSubscription(existingSub.id, {
      planId,
      provider,
      providerCustomerId: providerCustomerId || existingSub.provider_customer_id,
      providerSubscriptionId: providerSubscriptionId || existingSub.provider_subscription_id,
      status: "active",
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: false
    });
    return updated;
  }

  // Otherwise create a fresh subscription
  const created = await billingRepository.createSubscription({
    userId,
    planId,
    provider,
    providerCustomerId,
    providerSubscriptionId,
    status: "active",
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: false
  });

  return created;
};

/**
 * Marks a subscription to cancel at period end
 */
const cancelUserSubscription = async (userId) => {
  const subscription = await billingRepository.findActiveSubscriptionByUser(userId);
  if (!subscription) {
    throw new ApiError(404, "No active subscription found to cancel.", "SUBSCRIPTION_NOT_FOUND");
  }

  if (subscription.cancel_at_period_end) {
    return subscription; // Already marked for cancellation
  }

  const updated = await billingRepository.cancelSubscription(subscription.id, userId);
  return updated;
};

module.exports = {
  activateSubscription,
  cancelUserSubscription
};
