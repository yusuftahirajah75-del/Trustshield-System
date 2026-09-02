const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const {
  extractSignals,
  BRAND_TARGETS,
  LINGUISTIC_RULES
} = require("../src/services/signalExtractionService");

describe("Signal Extraction Engine", () => {
  test("extracts domain and structural signals correctly", () => {
    const url = "http://192.168.1.1:8080/account/login?redirect=https://evil.com";
    const result = extractSignals({
      url,
      contextText: "",
      urlIndicators: [
        { code: "HTTP_NOT_HTTPS", score: 10 },
        { code: "IP_ADDRESS_HOST", score: 25 },
        { code: "LOGIN_RELATED_PATH", score: 5 },
        { code: "REDIRECT_PARAMETER", score: 10 }
      ]
    });

    assert.ok(result.signalCodes.includes("HTTP_NOT_HTTPS"));
    assert.ok(result.signalCodes.includes("IP_ADDRESS_HOST"));
    assert.ok(result.signalCodes.includes("LOGIN_RELATED_PATH"));
    assert.ok(result.signalCodes.includes("REDIRECT_PARAMETER"));
    assert.ok(result.evidence.length >= 4);
  });

  test("detects brand impersonation deterministically", () => {
    const deceptiveUrl = "https://cbn-grant-relief-portal.top/claim";
    const result = extractSignals({
      url: deceptiveUrl,
      urlIndicators: [{ code: "SUSPICIOUS_TLD", score: 15 }]
    });

    assert.ok(result.signalCodes.includes("BRAND_IMPERSONATION"));
    assert.ok(result.signalCodes.includes("GOVERNMENT_CLAIM"));
    assert.ok(result.signalCodes.includes("SUSPICIOUS_TLD"));

    const brandEvidence = result.evidence.find(
      (e) => e.source === "brand_impersonation"
    );
    assert.ok(brandEvidence);
    assert.match(brandEvidence.title, /Central Bank of Nigeria/i);
  });

  test("does not flag legitimate brand root domain as impersonation", () => {
    const legitUrl = "https://www.cbn.gov.ng/rates";
    const result = extractSignals({
      url: legitUrl,
      urlIndicators: []
    });

    assert.strictEqual(
      result.signalCodes.includes("BRAND_IMPERSONATION"),
      false
    );
  });

  test("extracts linguistic triggers from context text", () => {
    const context =
      "Dear customer, urgently update your BVN and NIN within 24 hours to prevent your account from being suspended. Enter your ATM PIN and OTP here.";
    const result = extractSignals({
      url: "https://secure-update-notice.xyz/form",
      contextText: context,
      urlIndicators: [{ code: "SUSPICIOUS_TLD", score: 15 }]
    });

    assert.ok(result.signalCodes.includes("BVN_REQUEST"));
    assert.ok(result.signalCodes.includes("NIN_REQUEST"));
    assert.ok(result.signalCodes.includes("OTP_REQUEST"));
    assert.ok(result.signalCodes.includes("PIN_REQUEST"));
    assert.ok(result.signalCodes.includes("URGENCY"));
  });

  test("extracts job and delivery claims", () => {
    const jobText = "Apply now for 2026 recruitment form. Shortlisted candidates must pay fee.";
    const jobResult = extractSignals({
      url: "https://fedgov-jobs.click/apply",
      contextText: jobText
    });
    assert.ok(jobResult.signalCodes.includes("JOB_CLAIM"));
    assert.ok(jobResult.signalCodes.includes("PAYMENT_REQUEST"));

    const deliveryText = "Your parcel pending delivery. Pay customs clearance charge.";
    const deliveryResult = extractSignals({
      url: "https://dhl-parcel-tracking.xyz/track",
      contextText: deliveryText
    });
    assert.ok(deliveryResult.signalCodes.includes("DELIVERY_CLAIM"));
    assert.ok(deliveryResult.signalCodes.includes("PAYMENT_REQUEST"));
  });
});
