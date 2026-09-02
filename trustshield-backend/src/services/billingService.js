const crypto = require("crypto");
const billingRepository = require("../repositories/billingRepository");
const userRepository = require("../repositories/userRepository");
const subscriptionService = require("./subscriptionService");
const entitlementService = require("./entitlementService");
const { paymentProviderFactory, defaultProvider } = require("./providers");
const ApiError = require("../utils/apiError");
const env = require("../config/env");

/**
 * Returns all active plans available for subscription
 */
const getPlans = async () => {
  return billingRepository.listActivePlans();
};

/**
 * Retrieves the complete subscription, entitlement, and billing history overview for a user
 */
const getSubscriptionSummary = async (userId) => {
  const [entitlements, activeSub, paymentHistory] = await Promise.all([
    entitlementService.getUserEntitlements(userId),
    billingRepository.findActiveSubscriptionByUser(userId),
    billingRepository.listPaymentsByUser(userId, 10, 0)
  ]);

  return {
    entitlements,
    subscription: activeSub
      ? {
          id: activeSub.id,
          planName: activeSub.plan_name,
          planSlug: activeSub.plan_slug,
          status: activeSub.status,
          currentPeriodStart: activeSub.current_period_start,
          currentPeriodEnd: activeSub.current_period_end,
          cancelAtPeriodEnd: activeSub.cancel_at_period_end,
          provider: activeSub.provider
        }
      : null,
    paymentHistory: paymentHistory.map((p) => ({
      id: p.id,
      reference: p.reference,
      providerTransactionId: p.provider_transaction_id,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      paidAt: p.paid_at,
      planName: p.plan_name || "Custom",
      planSlug: p.plan_slug || null,
      createdAt: p.created_at
    }))
  };
};

/**
 * Initializes a checkout transaction for a specific plan
 */
const initializeCheckout = async ({ userId, planSlug, callbackUrl }) => {
  // 1. Retrieve user
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new ApiError(404, "User account not found.", "USER_NOT_FOUND");
  }

  // 2. Retrieve plan from database (Never trust client-supplied prices)
  const plan = await billingRepository.findPlanBySlug(planSlug);
  if (!plan) {
    throw new ApiError(404, `Plan '${planSlug}' not found.`, "INVALID_PLAN");
  }

  // 3. If plan is Free, activate directly without payment provider
  if (Number(plan.price) === 0) {
    const sub = await subscriptionService.activateSubscription({
      userId,
      planId: plan.id,
      provider: "system",
      periodDays: 365
    });

    return {
      isFree: true,
      planSlug: plan.slug,
      subscriptionId: sub.id,
      message: "Free plan activated successfully."
    };
  }

  // 4. Generate unique reference
  const randomSuffix = crypto.randomBytes(5).toString("hex");
  const reference = `ts_pay_${Date.now()}_${randomSuffix}`;

  // 5. Create pending payment record in PostgreSQL
  const payment = await billingRepository.createPayment({
    userId,
    provider: defaultProvider.name,
    reference,
    amount: plan.price,
    currency: plan.currency,
    status: "pending",
    metadata: {
      userId,
      planId: plan.id,
      planSlug: plan.slug,
      planName: plan.name
    }
  });

  // 6. Initialize transaction with payment provider
  const defaultCallback = `${env.clientUrl}/billing?reference=${reference}`;
  const checkoutResult = await defaultProvider.initializeTransaction({
    email: user.email,
    amount: plan.price,
    currency: plan.currency,
    reference,
    callbackUrl: callbackUrl || defaultCallback,
    metadata: {
      userId,
      planId: plan.id,
      planSlug: plan.slug
    }
  });

  return {
    isFree: false,
    authorizationUrl: checkoutResult.authorizationUrl,
    reference,
    accessCode: checkoutResult.accessCode || null,
    plan: {
      name: plan.name,
      slug: plan.slug,
      price: plan.price,
      currency: plan.currency
    }
  };
};

/**
 * Supplementary server-side verification of payment status
 */
const verifyPayment = async (reference) => {
  if (!reference) {
    throw new ApiError(400, "Payment reference is required.", "MISSING_REFERENCE");
  }

  const existingPayment = await billingRepository.findPaymentByReference(reference);
  if (!existingPayment) {
    throw new ApiError(404, "Transaction record not found for this reference.", "PAYMENT_NOT_FOUND");
  }

  // Verify directly with provider API
  const providerResult = await defaultProvider.verifyTransaction(reference);

  if (providerResult.success && existingPayment.status !== "success") {
    // Determine plan from payment metadata
    const metadata = existingPayment.metadata || {};
    let planId = metadata.planId;

    if (!planId && metadata.planSlug) {
      const plan = await billingRepository.findPlanBySlug(metadata.planSlug);
      planId = plan?.id;
    }

    if (!planId) {
      const starterPlan = await billingRepository.findPlanBySlug("starter");
      planId = starterPlan?.id;
    }

    // Activate or upgrade subscription
    const subscription = await subscriptionService.activateSubscription({
      userId: existingPayment.user_id,
      planId,
      provider: defaultProvider.name,
      providerCustomerId: providerResult.customerCode || null,
      providerSubscriptionId: providerResult.transactionId || null,
      periodDays: 30
    });

    // Update payment record in database
    await billingRepository.updatePaymentStatus(reference, {
      status: "success",
      providerTransactionId: providerResult.transactionId,
      paidAt: providerResult.paidAt || new Date(),
      metadata: {
        ...metadata,
        subscriptionId: subscription.id,
        verifiedVia: "api_verify"
      }
    });

    const entitlements = await entitlementService.getUserEntitlements(existingPayment.user_id);

    return {
      status: "success",
      reference,
      amount: existingPayment.amount,
      currency: existingPayment.currency,
      subscriptionId: subscription.id,
      entitlements
    };
  }

  return {
    status: existingPayment.status,
    reference,
    amount: existingPayment.amount,
    currency: existingPayment.currency
  };
};

/**
 * Authoritative Webhook Processor with Signature Verification and Idempotency
 */
const handleWebhook = async ({ providerName = "paystack", signature, rawBody, payload }) => {
  const provider = paymentProviderFactory.getProvider(providerName);

  // 1. Cryptographic Signature Verification
  const isValidSignature = provider.verifyWebhookSignature(signature, rawBody);
  if (!isValidSignature) {
    console.error(`❌ Invalid webhook signature from ${providerName}`);
    throw new ApiError(400, "Invalid webhook signature.", "INVALID_WEBHOOK_SIGNATURE");
  }

  // 2. Parse Event
  const parsed = provider.parseWebhookEvent(payload);
  const eventId = parsed.eventId;

  // 3. Idempotency Check: Prevent duplicate payment processing
  const existingEvent = await billingRepository.findBillingEvent(eventId);
  if (existingEvent && existingEvent.processed) {
    console.log(`⏩ Webhook event ${eventId} already processed. Skipping idempotently.`);
    return {
      success: true,
      duplicate: true,
      message: "Event already processed."
    };
  }

  // Record initial event entry if not present
  if (!existingEvent) {
    await billingRepository.recordBillingEvent({
      provider: provider.name,
      eventType: parsed.eventType,
      eventId,
      payload,
      processed: false
    });
  }

  // 4. Process authoritative state changes based on event type
  try {
    if (parsed.eventType === "charge.success" || parsed.eventType === "invoice.payment_success") {
      const reference = parsed.reference;
      let payment = await billingRepository.findPaymentByReference(reference);

      let userId = payment?.user_id || parsed.metadata?.userId;
      let planId = payment?.metadata?.planId || parsed.metadata?.planId;
      let planSlug = payment?.metadata?.planSlug || parsed.metadata?.planSlug;

      if (!planId && planSlug) {
        const plan = await billingRepository.findPlanBySlug(planSlug);
        planId = plan?.id;
      }

      if (!planId) {
        const defaultPaid = await billingRepository.findPlanBySlug("starter");
        planId = defaultPaid?.id;
      }

      // If user not known from payment reference, attempt to find user by customer email
      if (!userId && parsed.customerEmail) {
        const user = await userRepository.findUserByEmail(parsed.customerEmail);
        userId = user?.id;
      }

      if (userId && planId) {
        // Activate subscription
        const sub = await subscriptionService.activateSubscription({
          userId,
          planId,
          provider: provider.name,
          providerCustomerId: parsed.customerCode,
          providerSubscriptionId: parsed.subscriptionCode || String(parsed.eventId),
          periodDays: 30
        });

        // Persist or update payment
        if (payment) {
          await billingRepository.updatePaymentStatus(reference, {
            status: "success",
            providerTransactionId: String(parsed.eventId),
            paidAt: new Date(),
            metadata: {
              ...payment.metadata,
              subscriptionId: sub.id,
              webhookProcessedAt: new Date()
            }
          });
        } else {
          await billingRepository.createPayment({
            userId,
            subscriptionId: sub.id,
            provider: provider.name,
            providerTransactionId: String(parsed.eventId),
            reference,
            amount: parsed.amount,
            currency: parsed.currency,
            status: "success",
            paidAt: new Date(),
            metadata: {
              ...parsed.metadata,
              subscriptionId: sub.id,
              createdViaWebhook: true
            }
          });
        }
      }
    } else if (parsed.eventType === "invoice.payment_failed") {
      const reference = parsed.reference;
      if (reference) {
        await billingRepository.updatePaymentStatus(reference, {
          status: "failed",
          metadata: { failedAt: new Date() }
        });
      }
    }

    // 5. Mark event as processed
    await billingRepository.markBillingEventProcessed(eventId);

    return {
      success: true,
      duplicate: false,
      eventType: parsed.eventType,
      eventId
    };
  } catch (err) {
    console.error(`❌ Webhook processing failed for event ${eventId}:`, err);
    throw err;
  }
};

/**
 * Cancels a user's active subscription at period end
 */
const cancelSubscription = async (userId) => {
  return subscriptionService.cancelUserSubscription(userId);
};

module.exports = {
  getPlans,
  getSubscriptionSummary,
  initializeCheckout,
  verifyPayment,
  handleWebhook,
  cancelSubscription
};
