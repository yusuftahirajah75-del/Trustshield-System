const { query } = require("../config/database");

/**
 * Plans Queries
 */
const listActivePlans = async () => {
  const sql = `
    SELECT
      id,
      name,
      slug,
      description,
      price,
      currency,
      billing_interval,
      monthly_request_limit,
      rate_limit_per_minute,
      features,
      is_active,
      created_at,
      updated_at
    FROM plans
    WHERE is_active = TRUE
    ORDER BY price ASC
  `;
  const result = await query(sql);
  return result.rows;
};

const findPlanBySlug = async (slug) => {
  const sql = `
    SELECT
      id,
      name,
      slug,
      description,
      price,
      currency,
      billing_interval,
      monthly_request_limit,
      rate_limit_per_minute,
      features,
      is_active,
      created_at,
      updated_at
    FROM plans
    WHERE LOWER(slug) = LOWER($1) AND is_active = TRUE
    LIMIT 1
  `;
  const result = await query(sql, [slug]);
  return result.rows[0] || null;
};

const findPlanById = async (id) => {
  const sql = `
    SELECT
      id,
      name,
      slug,
      description,
      price,
      currency,
      billing_interval,
      monthly_request_limit,
      rate_limit_per_minute,
      features,
      is_active,
      created_at,
      updated_at
    FROM plans
    WHERE id = $1
    LIMIT 1
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
};

/**
 * Subscriptions Queries
 */
const findActiveSubscriptionByUser = async (userId) => {
  const sql = `
    SELECT
      s.id,
      s.user_id,
      s.plan_id,
      s.provider,
      s.provider_customer_id,
      s.provider_subscription_id,
      s.status,
      s.current_period_start,
      s.current_period_end,
      s.cancel_at_period_end,
      s.created_at,
      s.updated_at,
      p.name AS plan_name,
      p.slug AS plan_slug,
      p.price AS plan_price,
      p.currency AS plan_currency,
      p.monthly_request_limit,
      p.rate_limit_per_minute,
      p.features AS plan_features
    FROM subscriptions s
    INNER JOIN plans p ON p.id = s.plan_id
    WHERE s.user_id = $1
      AND s.status IN ('active', 'pending')
    ORDER BY
      CASE WHEN s.status = 'active' THEN 1 ELSE 2 END,
      s.created_at DESC
    LIMIT 1
  `;
  const result = await query(sql, [userId]);
  return result.rows[0] || null;
};

const findSubscriptionById = async (id) => {
  const sql = `
    SELECT
      s.*,
      p.name AS plan_name,
      p.slug AS plan_slug,
      p.monthly_request_limit,
      p.rate_limit_per_minute
    FROM subscriptions s
    INNER JOIN plans p ON p.id = s.plan_id
    WHERE s.id = $1
    LIMIT 1
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
};

const createSubscription = async ({
  userId,
  planId,
  provider = "paystack",
  providerCustomerId = null,
  providerSubscriptionId = null,
  status = "active",
  currentPeriodStart = new Date(),
  currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  cancelAtPeriodEnd = false
}) => {
  const sql = `
    INSERT INTO subscriptions (
      user_id,
      plan_id,
      provider,
      provider_customer_id,
      provider_subscription_id,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;
  const result = await query(sql, [
    userId,
    planId,
    provider,
    providerCustomerId,
    providerSubscriptionId,
    status,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd
  ]);
  return result.rows[0];
};

const updateSubscription = async (id, fields) => {
  const setClauses = [];
  const values = [];
  let index = 1;

  for (const [key, val] of Object.entries(fields)) {
    // Map camelCase to snake_case column names
    const colName = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    setClauses.push(`${colName} = $${index}`);
    values.push(val);
    index++;
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const sql = `
    UPDATE subscriptions
    SET ${setClauses.join(", ")}
    WHERE id = $${index}
    RETURNING *
  `;

  const result = await query(sql, values);
  return result.rows[0] || null;
};

const cancelSubscription = async (id, userId) => {
  const sql = `
    UPDATE subscriptions
    SET cancel_at_period_end = TRUE, updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING *
  `;
  const result = await query(sql, [id, userId]);
  return result.rows[0] || null;
};

/**
 * Payments Queries
 */
const createPayment = async ({
  userId,
  subscriptionId = null,
  provider = "paystack",
  providerTransactionId = null,
  reference,
  amount,
  currency = "USD",
  status = "pending",
  paidAt = null,
  metadata = {}
}) => {
  const sql = `
    INSERT INTO payments (
      user_id,
      subscription_id,
      provider,
      provider_transaction_id,
      reference,
      amount,
      currency,
      status,
      paid_at,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;
  const result = await query(sql, [
    userId,
    subscriptionId,
    provider,
    providerTransactionId,
    reference,
    amount,
    currency,
    status,
    paidAt,
    JSON.stringify(metadata)
  ]);
  return result.rows[0];
};

const findPaymentByReference = async (reference) => {
  const sql = `
    SELECT
      p.*,
      u.email,
      u.first_name,
      u.last_name
    FROM payments p
    LEFT JOIN users u ON u.id = p.user_id
    WHERE p.reference = $1
    LIMIT 1
  `;
  const result = await query(sql, [reference]);
  return result.rows[0] || null;
};

const updatePaymentStatus = async (reference, { status, providerTransactionId = null, paidAt = null, metadata = null }) => {
  const updates = [`status = $2`, `updated_at = NOW()`];
  const params = [reference, status];
  let paramIdx = 3;

  if (providerTransactionId) {
    updates.push(`provider_transaction_id = $${paramIdx}`);
    params.push(providerTransactionId);
    paramIdx++;
  }

  if (paidAt) {
    updates.push(`paid_at = $${paramIdx}`);
    params.push(paidAt);
    paramIdx++;
  }

  if (metadata) {
    updates.push(`metadata = metadata || $${paramIdx}::jsonb`);
    params.push(JSON.stringify(metadata));
    paramIdx++;
  }

  const sql = `
    UPDATE payments
    SET ${updates.join(", ")}
    WHERE reference = $1
    RETURNING *
  `;
  const result = await query(sql, params);
  return result.rows[0] || null;
};

const listPaymentsByUser = async (userId, limit = 20, offset = 0) => {
  const sql = `
    SELECT
      p.id,
      p.reference,
      p.provider_transaction_id,
      p.amount,
      p.currency,
      p.status,
      p.paid_at,
      p.metadata,
      p.created_at,
      s.plan_id,
      pl.name AS plan_name,
      pl.slug AS plan_slug
    FROM payments p
    LEFT JOIN subscriptions s ON s.id = p.subscription_id
    LEFT JOIN plans pl ON pl.id = s.plan_id
    WHERE p.user_id = $1
    ORDER BY p.created_at DESC
    LIMIT $2 OFFSET $3
  `;
  const result = await query(sql, [userId, limit, offset]);
  return result.rows;
};

/**
 * Billing Events / Webhook Idempotency Store
 */
const findBillingEvent = async (eventId) => {
  const sql = `
    SELECT * FROM billing_events
    WHERE event_id = $1
    LIMIT 1
  `;
  const result = await query(sql, [eventId]);
  return result.rows[0] || null;
};

const recordBillingEvent = async ({
  provider = "paystack",
  eventType,
  eventId,
  payload = {},
  processed = false
}) => {
  const sql = `
    INSERT INTO billing_events (
      provider,
      event_type,
      event_id,
      processed,
      payload,
      processed_at
    )
    VALUES ($1, $2, $3, $4, $5, CASE WHEN $4 = TRUE THEN NOW() ELSE NULL END)
    ON CONFLICT (event_id) DO NOTHING
    RETURNING *
  `;
  const result = await query(sql, [
    provider,
    eventType,
    eventId,
    processed,
    JSON.stringify(payload)
  ]);
  return result.rows[0] || null;
};

const markBillingEventProcessed = async (eventId) => {
  const sql = `
    UPDATE billing_events
    SET processed = TRUE, processed_at = NOW()
    WHERE event_id = $1
    RETURNING *
  `;
  const result = await query(sql, [eventId]);
  return result.rows[0] || null;
};

/**
 * Usage Tracking: Counts requests executed by the user in the current billing cycle
 */
const countUserRequestsInPeriod = async (userId, periodStart) => {
  const sql = `
    SELECT COUNT(*)::INTEGER AS count
    FROM api_usage_logs
    WHERE user_id = $1
      AND created_at >= $2
  `;
  const result = await query(sql, [userId, periodStart]);
  return result.rows[0]?.count || 0;
};

module.exports = {
  listActivePlans,
  findPlanBySlug,
  findPlanById,
  findActiveSubscriptionByUser,
  findSubscriptionById,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  createPayment,
  findPaymentByReference,
  updatePaymentStatus,
  listPaymentsByUser,
  findBillingEvent,
  recordBillingEvent,
  markBillingEventProcessed,
  countUserRequestsInPeriod
};
