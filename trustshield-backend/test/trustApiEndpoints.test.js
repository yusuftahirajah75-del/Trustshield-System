const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");

const app = require("../src/app");
const { query } = require("../src/config/database");
const userRepository = require("../src/repositories/userRepository");
const {
  generateApiKey,
  revokeApiKey,
  getDeveloperDashboardData
} = require("../src/services/developerService");

describe("Developer Digital Trust API End-to-End Suite", () => {
  let server;
  let baseUrl;
  let testUserId;
  let activeApiKeyData;
  let rateLimitedKeyData;

  const createdAnalysisIds = [];
  const createdReportIds = [];
  const createdKeyIds = [];

  before(async () => {
    // 1. Start ephemeral HTTP server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // 2. Get or create developer user
    const existing = await query("SELECT id FROM users LIMIT 1");
    if (existing.rows[0]) {
      testUserId = existing.rows[0].id;
    } else {
      const user = await userRepository.createUser({
        firstName: "DigitalTrust",
        lastName: "Architect",
        email: `trust-api-${Date.now()}@trustshield.io`,
        passwordHash: "hash-trust-test"
      });
      testUserId = user.id;
    }

    // 3. Generate primary active API key
    activeApiKeyData = await generateApiKey({
      userId: testUserId,
      name: "Primary Live Key",
      rateLimitPerMinute: 60
    });
    createdKeyIds.push(activeApiKeyData.id);

    // 4. Generate restricted API key for rate limit testing (limit: 2 req/min)
    rateLimitedKeyData = await generateApiKey({
      userId: testUserId,
      name: "Rate Limited Key",
      rateLimitPerMinute: 2
    });
    createdKeyIds.push(rateLimitedKeyData.id);
  });

  after(async () => {
    // Close server
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    // Clean up created entities
    for (const id of createdAnalysisIds) {
      await query("DELETE FROM analyses WHERE id = $1", [id]).catch(() => {});
    }
    for (const id of createdReportIds) {
      await query("DELETE FROM scam_reports WHERE id = $1", [id]).catch(() => {});
    }
    for (const id of createdKeyIds) {
      await query("DELETE FROM api_usage_logs WHERE api_key_id = $1", [id]).catch(() => {});
      await query("DELETE FROM api_keys WHERE id = $1", [id]).catch(() => {});
    }
  });

  test("API key creation generates ts_live_ prefix and secure hash", () => {
    assert.ok(activeApiKeyData.id);
    assert.ok(activeApiKeyData.rawKey.startsWith("ts_live_"));
    assert.ok(activeApiKeyData.keyPrefix.startsWith("ts_live_"));
    assert.strictEqual(activeApiKeyData.rateLimitPerMinute, 60);
  });

  test("rejects trust check request when API key is missing (401 UNAUTHENTICATED)", async () => {
    const res = await fetch(`${baseUrl}/api/v1/trust/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com" })
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error?.code === "UNAUTHENTICATED" || body.error?.code === "API_KEY_REQUIRED");
  });

  test("rejects trust check request with invalid API key (401 INVALID_API_KEY)", async () => {
    const res = await fetch(`${baseUrl}/api/v1/trust/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "ts_live_completely_fake_and_invalid_key_99999999"
      },
      body: JSON.stringify({ url: "https://example.com" })
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error?.code, "INVALID_API_KEY");
  });

  test("POST /api/v1/trust/check analyzes scam URL, executes Scam DNA, and returns clean structure", async () => {
    const scamUrl = "https://cbn-grant-relief-portal.top/claim?reward=50000";
    const contextText =
      "Central Bank of Nigeria FG Grant: Claim your 50,000 relief disbursement urgently. Enter your BVN and NIN to verify.";

    const res = await fetch(`${baseUrl}/api/v1/trust/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": activeApiKeyData.rawKey
      },
      body: JSON.stringify({
        url: scamUrl,
        contextText,
        semanticEvidence: ["GOVERNMENT_CLAIM", "FINANCIAL_LURE"]
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data);

    const data = body.data;
    createdAnalysisIds.push(data.requestId || data.id);

    // Required fields verification
    assert.ok(data.requestId);
    assert.strictEqual(data.url, scamUrl);
    assert.strictEqual(data.trustScore, 0);
    assert.ok(data.riskLevel === "HIGH" || data.riskLevel === "CRITICAL");
    assert.ok(Array.isArray(data.indicators));
    assert.ok(Array.isArray(data.evidence));
    assert.ok(data.evidence.length > 0);
    assert.ok(typeof data.confidence === "number");
    assert.ok(data.analysisTimestamp);

    // Scam DNA pattern verification
    assert.ok(data.scamPattern);
    assert.strictEqual(data.scamPattern.matched, true);
    assert.strictEqual(data.patternMatch, true);
    assert.strictEqual(data.scamPattern.name, "Government Grant Impersonation");
    assert.ok(data.scamPattern.signals.includes("GOVERNMENT_CLAIM"));
  });

  test("POST /api/v1/trust/check with Bearer token analyzes clean URL", async () => {
    const cleanUrl = "https://example.com/about";

    const res = await fetch(`${baseUrl}/api/v1/trust/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeApiKeyData.rawKey}`
      },
      body: JSON.stringify({ url: cleanUrl })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    const data = body.data;
    createdAnalysisIds.push(data.requestId || data.id);

    assert.ok(data.trustScore > 70);
    assert.strictEqual(data.riskLevel, "LOW");
    assert.strictEqual(data.scamPattern.matched, false);
    assert.strictEqual(data.patternMatch, false);
  });

  test("GET /api/v1/trust/:id returns complete stored intelligence, evidence, and context", async () => {
    const targetId = createdAnalysisIds[0];
    assert.ok(targetId);

    const res = await fetch(`${baseUrl}/api/v1/trust/${targetId}`, {
      headers: {
        "x-api-key": activeApiKeyData.rawKey
      }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    const data = body.data;
    assert.strictEqual(data.requestId, targetId);
    assert.strictEqual(data.trustScore, 0);
    assert.ok(data.riskLevel === "HIGH" || data.riskLevel === "CRITICAL");
    assert.ok(Array.isArray(data.indicators));
    assert.ok(Array.isArray(data.evidence));
    assert.ok(data.scamDNA);
    assert.strictEqual(data.scamDNA.matched, true);
    assert.strictEqual(data.scamDNA.name, "Government Grant Impersonation");
    assert.ok(Array.isArray(data.patternMatches));
    assert.ok(data.analysisContext);
    assert.ok(data.analysisContext.contextText.includes("Central Bank of Nigeria"));
    assert.ok(data.timestamp);
  });

  test("POST /api/v1/reports validates and connects intelligence to Scam DNA campaign", async () => {
    const reportPayload = {
      url: "https://zenith-ebanking-portal.click/verify",
      category: "credential_theft",
      description:
        "Urgent bank security prompt requesting ATM PIN and OTP credentials.",
      evidence: ["BANKING_CLAIM", "OTP_REQUEST", "PIN_REQUEST"]
    };

    const res = await fetch(`${baseUrl}/api/v1/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": activeApiKeyData.rawKey
      },
      body: JSON.stringify(reportPayload)
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    const data = body.data;
    createdReportIds.push(data.id);

    assert.ok(data.id);
    assert.strictEqual(data.url, reportPayload.url);
    assert.strictEqual(data.category, reportPayload.category);
    assert.strictEqual(data.status, "submitted");
    assert.ok(data.associatedPattern);
    assert.ok(data.extractedSignals.includes("BANKING_CLAIM"));
  });

  test("tracks usage telemetry and logs requests in api_usage_logs", async () => {
    // Give async res.on("finish") a brief moment to write to DB
    await new Promise((r) => setTimeout(r, 200));

    const logsRes = await query(
      "SELECT * FROM api_usage_logs WHERE api_key_id = $1 ORDER BY created_at DESC",
      [activeApiKeyData.id]
    );

    assert.ok(logsRes.rows.length >= 3);
    const checkLog = logsRes.rows.find((l) => l.endpoint.includes("/api/v1/trust/check"));
    assert.ok(checkLog);
    assert.strictEqual(checkLog.status_code, 200);
    assert.ok(checkLog.response_time_ms >= 0);
  });

  test("enforces dynamic per-key rate limiting (429 RATE_LIMIT_EXCEEDED)", async () => {
    const limitedKey = rateLimitedKeyData.rawKey;

    // Send rapid requests up to and beyond limit (limit is 2 req/min)
    const res1 = await fetch(`${baseUrl}/api/v1/trust/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": limitedKey },
      body: JSON.stringify({ url: "https://example.com/1" })
    });
    if (res1.status === 200) {
      const b = await res1.json();
      createdAnalysisIds.push(b.data.requestId || b.data.id);
    }

    const res2 = await fetch(`${baseUrl}/api/v1/trust/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": limitedKey },
      body: JSON.stringify({ url: "https://example.com/2" })
    });
    if (res2.status === 200) {
      const b = await res2.json();
      createdAnalysisIds.push(b.data.requestId || b.data.id);
    }

    const res3 = await fetch(`${baseUrl}/api/v1/trust/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": limitedKey },
      body: JSON.stringify({ url: "https://example.com/3" })
    });

    assert.strictEqual(res3.status, 429);
    const body = await res3.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error?.code, "RATE_LIMIT_EXCEEDED");
  });

  test("aggregates developer dashboard telemetry and statistics", async () => {
    const dashboard = await getDeveloperDashboardData(testUserId);

    assert.ok(dashboard);
    assert.ok(dashboard.totalRequests >= 3);
    assert.ok(dashboard.successfulRequests >= 2);
    assert.ok(dashboard.threatDetections >= 1);
    assert.ok(dashboard.riskDistribution);
    assert.ok(dashboard.riskDistribution.low >= 1);
    assert.ok(dashboard.riskDistribution.critical >= 1 || dashboard.riskDistribution.high >= 1);
    assert.ok(dashboard.usage);
    assert.strictEqual(dashboard.usage.limit, 10000);
    assert.ok(Array.isArray(dashboard.recentActivity));
    assert.ok(dashboard.recentActivity.length >= 1);
    assert.ok(Array.isArray(dashboard.allKeys));
  });

  test("revoked API key is immediately rejected with 401 INVALID_API_KEY", async () => {
    await revokeApiKey({
      id: activeApiKeyData.id,
      userId: testUserId
    });

    const res = await fetch(`${baseUrl}/api/v1/trust/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": activeApiKeyData.rawKey
      },
      body: JSON.stringify({ url: "https://example.com" })
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error?.code, "INVALID_API_KEY");
  });
});
