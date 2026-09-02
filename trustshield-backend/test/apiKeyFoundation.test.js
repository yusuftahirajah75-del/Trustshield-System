const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { pool, query } = require("../src/config/database");
const userRepository = require("../src/repositories/userRepository");
const apiKeyRepository = require("../src/repositories/apiKeyRepository");
const {
  hashApiKey,
  generateApiKey,
  listApiKeys,
  revokeApiKey,
  getDeveloperDashboardData
} = require("../src/services/developerService");

describe("Developer API Foundation & Key Management", () => {
  let testUserId;
  let testKeyId;
  let rawSecretKey;

  before(async () => {
    // Get or create a test user
    const existing = await query("SELECT id FROM users LIMIT 1");
    if (existing.rows[0]) {
      testUserId = existing.rows[0].id;
    } else {
      const user = await userRepository.createUser({
        firstName: "Developer",
        lastName: "Test",
        email: `dev-${Date.now()}@trustshield.io`,
        passwordHash: "hash123"
      });
      testUserId = user.id;
    }
  });

  after(async () => {
    if (testKeyId) {
      await query("DELETE FROM api_keys WHERE id = $1", [testKeyId]).catch(() => {});
    }
    await pool.end();
  });

  test("generates cryptographically secure API key with prefix and hash", async () => {
    const keyData = await generateApiKey({
      userId: testUserId,
      name: "Test Developer Key",
      rateLimitPerMinute: 120
    });

    assert.ok(keyData.id);
    assert.ok(keyData.rawKey.startsWith("ts_live_"));
    assert.ok(keyData.keyPrefix.startsWith("ts_live_"));
    assert.strictEqual(keyData.rateLimitPerMinute, 120);

    testKeyId = keyData.id;
    rawSecretKey = keyData.rawKey;

    // Verify key hash in database matches SHA-256
    const expectedHash = hashApiKey(rawSecretKey);
    const stored = await apiKeyRepository.findApiKeyByHash(expectedHash);
    assert.ok(stored);
    assert.strictEqual(stored.id, testKeyId);
    assert.strictEqual(stored.is_active, true);
  });

  test("lists API keys for user", async () => {
    const keys = await listApiKeys(testUserId);
    assert.ok(Array.isArray(keys));
    const found = keys.find((k) => k.id === testKeyId);
    assert.ok(found);
  });

  test("logs API usage and request tracking", async () => {
    const log = await apiKeyRepository.logApiUsage({
      apiKeyId: testKeyId,
      userId: testUserId,
      endpoint: "/api/v1/trust/check",
      statusCode: 200,
      riskLevel: "CRITICAL",
      isThreat: true,
      ipAddress: "127.0.0.1",
      responseTimeMs: 45
    });

    assert.ok(log.id);
  });

  test("aggregates developer dashboard metrics", async () => {
    const data = await getDeveloperDashboardData(testUserId);
    assert.ok(data);
    assert.ok(typeof data.totalRequests === "number");
    assert.ok(typeof data.threatDetections === "number");
    assert.ok(data.riskDistribution);
    assert.ok(data.usage);
    assert.strictEqual(data.usage.limit, 10000);
    assert.ok(Array.isArray(data.allKeys));
  });

  test("revokes API key successfully", async () => {
    const revoked = await revokeApiKey({
      id: testKeyId,
      userId: testUserId
    });

    assert.strictEqual(revoked.is_active, false);

    const hash = hashApiKey(rawSecretKey);
    const lookup = await apiKeyRepository.findApiKeyByHash(hash);
    assert.strictEqual(lookup, null); // Active lookup returns null for revoked keys
  });
});
