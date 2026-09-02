const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const crypto = require("crypto");

const app = require("../src/app");
const { pool, query } = require("../src/config/database");
const userRepository = require("../src/repositories/userRepository");
const billingRepository = require("../src/repositories/billingRepository");
const { generateAccessToken } = require("../src/utils/jwt");
const { generateApiKey } = require("../src/services/developerService");
const env = require("../src/config/env");

describe("TrustShield Billing & Payment End-to-End Suite", () => {
  let server;
  let baseUrl;
  let testUser;
  let authCookie;
  let testApiKey;
  const createdUserIds = [];
  const createdKeyIds = [];
  const createdPaymentRefs = [];
  const createdEventIds = [];

  before(async () => {
    // 1. Start ephemeral HTTP server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // 2. Create dedicated test user
    testUser = await userRepository.createUser({
      firstName: "Billing",
      lastName: "Tester",
      email: `billing-test-${Date.now()}@trustshield.io`,
      passwordHash: "hash-billing-test",
      role: "user"
    });
    createdUserIds.push(testUser.id);

    // 3. Generate auth cookie
    const token = generateAccessToken(testUser);
    authCookie = `${env.cookieName}=${token}`;

    // 4. Generate developer API key for test user
    testApiKey = await generateApiKey({
      userId: testUser.id,
      name: "Billing Suite Key",
      rateLimitPerMinute: 60
    });
    createdKeyIds.push(testApiKey.id);
  });

  after(async () => {
    // Clean up created entities
    for (const ref of createdPaymentRefs) {
      await query("DELETE FROM payments WHERE reference = $1", [ref]).catch(() => {});
    }
    for (const eventId of createdEventIds) {
      await query("DELETE FROM billing_events WHERE event_id = $1", [eventId]).catch(() => {});
    }
    for (const id of createdKeyIds) {
      await query("DELETE FROM api_usage_logs WHERE api_key_id = $1", [id]).catch(() => {});
      await query("DELETE FROM api_keys WHERE id = $1", [id]).catch(() => {});
    }
    for (const id of createdUserIds) {
      await query("DELETE FROM subscriptions WHERE user_id = $1", [id]).catch(() => {});
      await query("DELETE FROM api_usage_logs WHERE user_id = $1", [id]).catch(() => {});
      await query("DELETE FROM analyses WHERE user_id = $1", [id]).catch(() => {});
      await query("DELETE FROM users WHERE id = $1", [id]).catch(() => {});
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  });

  test("GET /api/v1/billing/plans returns all active configurable plans", async () => {
    const res = await fetch(`${baseUrl}/api/v1/billing/plans`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.plans));
    assert.strictEqual(body.data.plans.length, 4);

    const slugs = body.data.plans.map((p) => p.slug);
    assert.ok(slugs.includes("free"));
    assert.ok(slugs.includes("starter"));
    assert.ok(slugs.includes("growth"));
    assert.ok(slugs.includes("business"));

    const starter = body.data.plans.find((p) => p.slug === "starter");
    assert.strictEqual(starter.monthly_request_limit, 5000);
    assert.strictEqual(Number(starter.price), 19.00);
  });

  test("GET /api/v1/billing/subscription returns default free tier for new user", async () => {
    const res = await fetch(`${baseUrl}/api/v1/billing/subscription`, {
      headers: { Cookie: authCookie }
    });
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.entitlements.plan, "free");
    assert.strictEqual(body.data.entitlements.monthlyLimit, 500);
    assert.ok(body.data.entitlements.remaining <= 500);
  });

  test("POST /api/v1/billing/checkout validates plan slug and blocks invalid plans", async () => {
    const res = await fetch(`${baseUrl}/api/v1/billing/checkout`, {
      method: "POST",
      headers: {
        Cookie: authCookie,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ planSlug: "nonexistent-super-tier" })
    });

    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error?.code, "INVALID_PLAN");
  });

  test("POST /api/v1/billing/checkout enforces server-side pricing and initializes transaction", async () => {
    const res = await fetch(`${baseUrl}/api/v1/billing/checkout`, {
      method: "POST",
      headers: {
        Cookie: authCookie,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ planSlug: "starter" })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.reference.startsWith("ts_pay_"));
    assert.ok(body.data.authorizationUrl);
    assert.strictEqual(body.data.plan.slug, "starter");
    assert.strictEqual(Number(body.data.plan.price), 19.00);

    createdPaymentRefs.push(body.data.reference);

    // Verify pending record in database
    const payment = await billingRepository.findPaymentByReference(body.data.reference);
    assert.ok(payment);
    assert.strictEqual(payment.status, "pending");
    assert.strictEqual(Number(payment.amount), 19.00);
  });

  test("GET /api/v1/billing/verify/:reference verifies transaction and activates subscription", async () => {
    // 1. Create a checkout
    const checkoutRes = await fetch(`${baseUrl}/api/v1/billing/checkout`, {
      method: "POST",
      headers: {
        Cookie: authCookie,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ planSlug: "starter" })
    });
    const checkoutBody = await checkoutRes.json();
    const reference = checkoutBody.data.reference;
    createdPaymentRefs.push(reference);

    // 2. Call verify endpoint
    const verifyRes = await fetch(`${baseUrl}/api/v1/billing/verify/${reference}`, {
      headers: { Cookie: authCookie }
    });
    assert.strictEqual(verifyRes.status, 200);
    const verifyBody = await verifyRes.json();
    assert.strictEqual(verifyBody.success, true);
    assert.strictEqual(verifyBody.data.status, "success");

    // 3. Verify user's subscription in DB is now 'starter' with 5000 quota
    const subRes = await fetch(`${baseUrl}/api/v1/billing/subscription`, {
      headers: { Cookie: authCookie }
    });
    const subBody = await subRes.json();
    assert.strictEqual(subBody.data.entitlements.plan, "starter");
    assert.strictEqual(subBody.data.entitlements.monthlyLimit, 5000);
    assert.strictEqual(subBody.data.entitlements.status, "active");
  });

  test("POST /api/v1/billing/webhook rejects requests with invalid signature (400)", async () => {
    const invalidSignature = "deadbeef1234567890abcdef";
    const res = await fetch(`${baseUrl}/api/v1/billing/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-paystack-signature": invalidSignature
      },
      body: JSON.stringify({ event: "charge.success" })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error?.code, "INVALID_WEBHOOK_SIGNATURE");
  });

  test("POST /api/v1/billing/webhook verifies HMAC SHA512 signature and activates plan", async () => {
    const eventId = `evt_test_${Date.now()}`;
    const reference = `ts_wh_${Date.now()}`;
    createdEventIds.push(eventId);
    createdPaymentRefs.push(reference);

    const payload = {
      event: "charge.success",
      data: {
        id: eventId,
        reference,
        amount: 4900, // $49.00 Growth Plan
        currency: "USD",
        status: "success",
        customer: {
          email: testUser.email,
          customer_code: "CUS_test_123"
        },
        metadata: {
          userId: testUser.id,
          planSlug: "growth"
        }
      }
    };

    const rawBody = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha512", env.paymentWebhookSecret)
      .update(rawBody)
      .digest("hex");

    const res = await fetch(`${baseUrl}/api/v1/billing/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-paystack-signature": signature
      },
      body: rawBody
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, "success");
    assert.strictEqual(body.data.duplicate, false);

    // Verify subscription upgraded to growth (25,000 checks)
    const subRes = await fetch(`${baseUrl}/api/v1/billing/subscription`, {
      headers: { Cookie: authCookie }
    });
    const subBody = await subRes.json();
    assert.strictEqual(subBody.data.entitlements.plan, "growth");
    assert.strictEqual(subBody.data.entitlements.monthlyLimit, 25000);
  });

  test("POST /api/v1/billing/webhook enforces idempotency on duplicate event delivery", async () => {
    const eventId = `evt_idempotent_${Date.now()}`;
    const reference = `ts_dup_${Date.now()}`;
    createdEventIds.push(eventId);
    createdPaymentRefs.push(reference);

    const payload = {
      event: "charge.success",
      data: {
        id: eventId,
        reference,
        amount: 1900,
        currency: "USD",
        status: "success",
        customer: { email: testUser.email },
        metadata: { userId: testUser.id, planSlug: "starter" }
      }
    };

    const rawBody = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha512", env.paymentWebhookSecret)
      .update(rawBody)
      .digest("hex");

    // First delivery
    const res1 = await fetch(`${baseUrl}/api/v1/billing/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-paystack-signature": signature
      },
      body: rawBody
    });
    assert.strictEqual(res1.status, 200);
    const body1 = await res1.json();
    assert.strictEqual(body1.data.duplicate, false);

    // Second delivery (duplicate replay)
    const res2 = await fetch(`${baseUrl}/api/v1/billing/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-paystack-signature": signature
      },
      body: rawBody
    });
    assert.strictEqual(res2.status, 200);
    const body2 = await res2.json();
    assert.strictEqual(body2.data.duplicate, true);
  });

  test("POST /api/v1/trust/check succeeds when quota is available", async () => {
    const res = await fetch(`${baseUrl}/api/v1/trust/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": testApiKey.rawKey
      },
      body: JSON.stringify({
        url: "https://paystack-verified-example.com/login"
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.trustScore !== undefined);
  });

  test("POST /api/v1/trust/check blocks request with 402 Payment Required when monthly limit is reached", async () => {
    // Create a temporary user on Free plan (limit 500)
    const quotaUser = await userRepository.createUser({
      firstName: "Quota",
      lastName: "LimitTest",
      email: `quota-limit-${Date.now()}@trustshield.io`,
      passwordHash: "hash-quota",
      role: "user"
    });
    createdUserIds.push(quotaUser.id);

    const quotaApiKey = await generateApiKey({
      userId: quotaUser.id,
      name: "Exhausted Quota Key"
    });
    createdKeyIds.push(quotaApiKey.id);

    // Artificially simulate 500 used requests in api_usage_logs for quotaUser
    const insertPromises = [];
    for (let i = 0; i < 500; i++) {
      insertPromises.push(
        billingRepository.countUserRequestsInPeriod(quotaUser.id, new Date()) // warm up
      );
    }
    // Efficiently insert 500 logs
    await query(`
      INSERT INTO api_usage_logs (user_id, api_key_id, endpoint, status_code, created_at)
      SELECT $1, $2, '/api/v1/trust/check', 200, NOW()
      FROM generate_series(1, 500)
    `, [quotaUser.id, quotaApiKey.id]);

    // Now attempt a trust check
    const res = await fetch(`${baseUrl}/api/v1/trust/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": quotaApiKey.rawKey
      },
      body: JSON.stringify({ url: "https://example.com/check-limit" })
    });

    assert.strictEqual(res.status, 402);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error, "MONTHLY_LIMIT_REACHED");
    assert.strictEqual(body.upgradeRequired, true);
    assert.strictEqual(body.quota.remaining, 0);
  });

  test("POST /api/v1/billing/subscription/cancel marks cancel_at_period_end = true", async () => {
    const res = await fetch(`${baseUrl}/api/v1/billing/subscription/cancel`, {
      method: "POST",
      headers: { Cookie: authCookie }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.subscription.cancel_at_period_end, true);
  });
});
