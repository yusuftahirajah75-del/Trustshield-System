const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const crypto = require("crypto");

const app = require("../src/app");
const { pool, query } = require("../src/config/database");
const userRepository = require("../src/repositories/userRepository");
const billingRepository = require("../src/repositories/billingRepository");
const { generateAccessToken } = require("../src/utils/jwt");
const env = require("../src/config/env");

describe("🔥 Primary Business Objective End-to-End Test: Free User -> Paid Customer Lifecycle", () => {
  let server;
  let baseUrl;
  let customerUser;
  let authCookie;
  let apiKeySecret;
  let apiKeyRecord;
  let checkoutReference;
  const createdPaymentRefs = [];
  const createdEventIds = [];

  before(async () => {
    // 1. Launch HTTP server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // 2. Step 1: Create Account
    customerUser = await userRepository.createUser({
      firstName: "Amina",
      lastName: "Developer",
      email: `first-paying-customer-${Date.now()}@trustshield.io`,
      passwordHash: "secure-customer-hash",
      role: "user"
    });

    // 3. Step 2: Login session
    const token = generateAccessToken(customerUser);
    authCookie = `${env.cookieName}=${token}`;
  });

  after(async () => {
    // Clean up test data
    for (const ref of createdPaymentRefs) {
      await query("DELETE FROM payments WHERE reference = $1", [ref]).catch(() => {});
    }
    for (const eventId of createdEventIds) {
      await query("DELETE FROM billing_events WHERE event_id = $1", [eventId]).catch(() => {});
    }
    if (customerUser) {
      await query("DELETE FROM subscriptions WHERE user_id = $1", [customerUser.id]).catch(() => {});
      await query("DELETE FROM api_usage_logs WHERE user_id = $1", [customerUser.id]).catch(() => {});
      await query("DELETE FROM api_keys WHERE user_id = $1", [customerUser.id]).catch(() => {});
      await query("DELETE FROM analyses WHERE user_id = $1", [customerUser.id]).catch(() => {});
      await query("DELETE FROM users WHERE id = $1", [customerUser.id]).catch(() => {});
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  });

  test("Step 1 & 2: User starts on Free Plan with 500 checks/month limit", async () => {
    const res = await fetch(`${baseUrl}/api/v1/billing/subscription`, {
      headers: { Cookie: authCookie }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.entitlements.plan, "free");
    assert.strictEqual(body.data.entitlements.monthlyLimit, 500);
    assert.strictEqual(body.data.entitlements.used, 0);
    assert.strictEqual(body.data.entitlements.remaining, 500);
  });

  test("Step 3: User generates API key and makes initial trust check on Free Tier", async () => {
    // Generate key
    const keyRes = await fetch(`${baseUrl}/api/v1/developer/keys`, {
      method: "POST",
      headers: {
        Cookie: authCookie,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: "Production Gateway Key" })
    });
    assert.strictEqual(keyRes.status, 201);
    const keyBody = await keyRes.json();
    apiKeySecret = keyBody.data.apiKey.rawKey;
    apiKeyRecord = keyBody.data.apiKey;

    assert.ok(apiKeySecret.startsWith("ts_live_"));

    // Run trust check
    const checkRes = await fetch(`${baseUrl}/api/v1/trust/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKeySecret
      },
      body: JSON.stringify({ url: "https://paystack-customer-portal.ng" })
    });
    assert.strictEqual(checkRes.status, 200);
    const checkBody = await checkRes.json();
    assert.strictEqual(checkBody.success, true);
    assert.ok(checkBody.data.trustScore !== undefined);

    // Allow finish hook to log to api_usage_logs
    let subBody;
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 60));
      const subRes = await fetch(`${baseUrl}/api/v1/billing/subscription`, {
        headers: { Cookie: authCookie }
      });
      subBody = await subRes.json();
      if (subBody.data.entitlements.used === 1) break;
    }

    assert.strictEqual(subBody.data.entitlements.used, 1);
    assert.strictEqual(subBody.data.entitlements.remaining, 499);
  });

  test("Step 4: User chooses Starter plan and initializes Paystack checkout", async () => {
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
    assert.ok(body.data.authorizationUrl);
    assert.ok(body.data.reference.startsWith("ts_pay_"));
    assert.strictEqual(Number(body.data.plan.price), 19.00);

    checkoutReference = body.data.reference;
    createdPaymentRefs.push(checkoutReference);

    // Verify pending payment record exists in PostgreSQL
    const payment = await billingRepository.findPaymentByReference(checkoutReference);
    assert.ok(payment);
    assert.strictEqual(payment.status, "pending");
    assert.strictEqual(payment.user_id, customerUser.id);
  });

  test("Step 5: Paystack Webhook delivers payment confirmation -> Account upgraded to Starter", async () => {
    const eventId = `wh_e2e_${Date.now()}`;
    createdEventIds.push(eventId);

    const payload = {
      event: "charge.success",
      data: {
        id: eventId,
        reference: checkoutReference,
        amount: 1900, // $19.00 in cents
        currency: "USD",
        status: "success",
        customer: {
          email: customerUser.email,
          customer_code: "CUS_PAYING_CUSTOMER_01"
        },
        metadata: {
          userId: customerUser.id,
          planSlug: "starter"
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

    // Verify PostgreSQL subscription table
    const sub = await billingRepository.findActiveSubscriptionByUser(customerUser.id);
    assert.ok(sub);
    assert.strictEqual(sub.status, "active");
    assert.strictEqual(sub.plan_slug, "starter");
    assert.strictEqual(sub.monthly_request_limit, 5000);
    assert.strictEqual(sub.rate_limit_per_minute, 120);

    // Verify PostgreSQL payments table
    const payment = await billingRepository.findPaymentByReference(checkoutReference);
    assert.ok(payment);
    assert.strictEqual(payment.status, "success");
    assert.ok(payment.paid_at);
  });

  test("Step 6: Developer Dashboard and Entitlements API reflect 5,000 monthly limit", async () => {
    // Check billing subscription endpoint
    const res = await fetch(`${baseUrl}/api/v1/billing/subscription`, {
      headers: { Cookie: authCookie }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.entitlements.plan, "starter");
    assert.strictEqual(body.data.entitlements.planName, "Starter");
    assert.strictEqual(body.data.entitlements.monthlyLimit, 5000);
    assert.strictEqual(body.data.entitlements.used, 0);
    assert.strictEqual(body.data.entitlements.remaining, 5000);
    assert.strictEqual(body.data.entitlements.rateLimitPerMinute, 120);
    assert.strictEqual(body.data.entitlements.status, "active");

    // Check payment history has 1 paid record
    assert.strictEqual(body.data.paymentHistory.length, 1);
    assert.strictEqual(body.data.paymentHistory[0].reference, checkoutReference);
    assert.strictEqual(body.data.paymentHistory[0].status, "success");

    // Check developer stats endpoint
    const statsRes = await fetch(`${baseUrl}/api/v1/developer/stats`, {
      headers: { Cookie: authCookie }
    });
    assert.strictEqual(statsRes.status, 200);
    const statsBody = await statsRes.json();
    assert.strictEqual(statsBody.data.entitlements.plan, "starter");
    assert.strictEqual(statsBody.data.entitlements.monthlyLimit, 5000);
  });

  test("Step 7: Customer performs trust check under upgraded Starter plan -> Usage increments", async () => {
    const res = await fetch(`${baseUrl}/api/v1/trust/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKeySecret
      },
      body: JSON.stringify({ url: "https://partner-integration.ng/api/v1" })
    });

    assert.strictEqual(res.status, 200);

    // Allow finish hook to log to api_usage_logs
    let subBody;
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 60));
      const subRes = await fetch(`${baseUrl}/api/v1/billing/subscription`, {
        headers: { Cookie: authCookie }
      });
      subBody = await subRes.json();
      if (subBody.data.entitlements.used === 1) break;
    }

    assert.strictEqual(subBody.data.entitlements.used, 1);
    assert.strictEqual(subBody.data.entitlements.remaining, 4999);
  });

  test("Step 8: Idempotency safety — Duplicate webhook replay does not duplicate payments or changes", async () => {
    const eventId = `wh_e2e_replay_${Date.now()}`;
    createdEventIds.push(eventId);

    const payload = {
      event: "charge.success",
      data: {
        id: eventId,
        reference: checkoutReference,
        amount: 1900,
        currency: "USD",
        status: "success",
        customer: { email: customerUser.email },
        metadata: { userId: customerUser.id, planSlug: "starter" }
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

    // Duplicate replay
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

    // Confirm only 1 subscription exists for customer
    const subsCount = await query(
      "SELECT COUNT(*)::INTEGER AS count FROM subscriptions WHERE user_id = $1",
      [customerUser.id]
    );
    assert.strictEqual(subsCount.rows[0].count, 1);
  });
});
