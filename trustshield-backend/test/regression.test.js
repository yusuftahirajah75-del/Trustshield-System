const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const { analyzeUrl } = require("../src/services/urlAnalysisService");
const { calculateRisk } = require("../src/services/riskScoringService");
const { hashPassword, comparePassword } = require("../src/utils/password");
const { generateAccessToken, verifyAccessToken } = require("../src/utils/jwt");

describe("Existing Functionality Regression Suite", () => {
  test("URL Analyzer accurately extracts core indicators", () => {
    const url = "http://xn--80ak6aa92e.com:8080/reset/password?redirect=http://test.com";
    const analysis = analyzeUrl(url);

    assert.ok(analysis.normalizedUrl);
    const codes = analysis.indicators.map((i) => i.code);
    assert.ok(codes.includes("HTTP_NOT_HTTPS"));
    assert.ok(codes.includes("PUNYCODE_DOMAIN"));
    assert.ok(codes.includes("NON_STANDARD_PORT"));
    assert.ok(codes.includes("LOGIN_RELATED_PATH"));
    assert.ok(codes.includes("REDIRECT_PARAMETER"));
  });

  test("Risk Scoring Engine calculates riskScore and levels according to constants", () => {
    const indicators = [
      { code: "IP_ADDRESS_HOST", score: 25 },
      { code: "CREDENTIALS_IN_URL", score: 25 },
      { code: "AT_SYMBOL_IN_URL", score: 20 },
      { code: "SUSPICIOUS_TLD", score: 15 }
    ];

    const result = calculateRisk(indicators);
    assert.strictEqual(result.riskScore, 85);
    assert.strictEqual(result.riskLevel, "critical");
    assert.ok(result.summary.length > 10);
  });

  test("Password utilities function securely", async () => {
    const plain = "Secur3P@ssw0rd!";
    const hashed = await hashPassword(plain);
    assert.ok(hashed);
    assert.notStrictEqual(hashed, plain);

    const valid = await comparePassword(plain, hashed);
    assert.strictEqual(valid, true);

    const invalid = await comparePassword("WrongPassword", hashed);
    assert.strictEqual(invalid, false);
  });

  test("JWT tokens sign and verify with correct payload", () => {
    const user = { id: "00000000-0000-0000-0000-000000000001", role: "user" };
    const token = generateAccessToken(user);
    assert.ok(token);

    const payload = verifyAccessToken(token);
    assert.strictEqual(payload.sub, user.id);
    assert.strictEqual(payload.role, user.role);
  });
});
