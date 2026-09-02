const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const {
  matchScamPatterns,
  resolvePrimaryScamPattern
} = require("../src/services/scamDnaMatcherService");

describe("Scam DNA Matching Engine", () => {
  const samplePatterns = [
    {
      id: "pat-1",
      patternCode: "NG-GOV-GRANT-001",
      patternName: "Government Grant Impersonation",
      countryCode: "NG",
      category: "financial_scam",
      description: "Deceptive government grant lure",
      severity: "critical",
      recommendation: "AVOID",
      signals: [
        { signalCode: "GOVERNMENT_CLAIM", required: true, weight: 3.0 },
        { signalCode: "FINANCIAL_LURE", required: true, weight: 3.0 },
        { signalCode: "SUSPICIOUS_TLD", required: false, weight: 1.5 },
        { signalCode: "URGENCY", required: false, weight: 1.5 }
      ]
    },
    {
      id: "pat-2",
      patternCode: "NG-BANK-IMPERSONATION-001",
      patternName: "Banking Impersonation",
      countryCode: "NG",
      category: "financial_scam",
      description: "Bank credential theft",
      severity: "critical",
      recommendation: "AVOID",
      signals: [
        { signalCode: "BANKING_CLAIM", required: true, weight: 3.0 },
        { signalCode: "CREDENTIAL_REQUEST", required: true, weight: 2.5 },
        { signalCode: "OTP_REQUEST", required: false, weight: 3.0 }
      ]
    }
  ];

  test("matches when all required signals are satisfied", () => {
    const indicators = [
      { code: "GOVERNMENT_CLAIM" },
      { code: "FINANCIAL_LURE" },
      { code: "SUSPICIOUS_TLD" }
    ];

    const matches = matchScamPatterns({
      indicators,
      patterns: samplePatterns
    });

    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].patternCode, "NG-GOV-GRANT-001");
    assert.strictEqual(matches[0].requiredSignals.satisfied, true);
    assert.ok(matches[0].confidence > 0.7);
  });

  test("rejects pattern match when required signals are missing", () => {
    // Only GOVERNMENT_CLAIM, missing FINANCIAL_LURE
    const indicators = [
      { code: "GOVERNMENT_CLAIM" },
      { code: "SUSPICIOUS_TLD" }
    ];

    const matches = matchScamPatterns({
      indicators,
      patterns: samplePatterns
    });

    assert.strictEqual(matches.length, 0);
  });

  test("avoids false certainty for unrelated indicators", () => {
    const indicators = [
      { code: "HTTP_NOT_HTTPS" },
      { code: "LONG_URL" }
    ];

    const result = resolvePrimaryScamPattern({
      indicators,
      patterns: samplePatterns
    });

    assert.strictEqual(result.scamPattern.matched, false);
    assert.strictEqual(result.scamPattern.patternId, null);
    assert.strictEqual(result.scamPattern.confidence, 0);
    assert.deepStrictEqual(result.scamPattern.signals, []);
  });

  test("formats resolved primary pattern correctly", () => {
    const indicators = [
      { code: "BANKING_CLAIM" },
      { code: "CREDENTIAL_REQUEST" },
      { code: "OTP_REQUEST" }
    ];

    const result = resolvePrimaryScamPattern({
      indicators,
      patterns: samplePatterns
    });

    assert.strictEqual(result.scamPattern.matched, true);
    assert.strictEqual(result.scamPattern.patternId, "pat-2");
    assert.strictEqual(result.scamPattern.name, "Banking Impersonation");
    assert.strictEqual(result.scamPattern.confidence, 1.0);
    assert.ok(result.scamPattern.signals.includes("BANKING_CLAIM"));
    assert.ok(result.scamPattern.signals.includes("CREDENTIAL_REQUEST"));
    assert.ok(result.scamPattern.signals.includes("OTP_REQUEST"));
  });
});
