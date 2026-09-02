const { test, describe, after } = require("node:test");
const assert = require("node:assert/strict");

const { pool, query } = require("../src/config/database");
const { runTrustCheck, getUserAnalysis } = require("../src/services/analysisService");

describe("Trust Check & TrustScore Intelligence Flow", () => {
  const createdAnalysisIds = [];

  after(async () => {
    for (const id of createdAnalysisIds) {
      await query("DELETE FROM analyses WHERE id = $1", [id]).catch(() => {});
    }
    await pool.end();
  });

  test("analyzes high-risk scam URL and matches Scam DNA pattern", async () => {
    // Government grant impersonation scenario
    const scamUrl = "https://cbn-grant-relief-portal.top/claim?reward=50000";
    const contextText =
      "Central Bank of Nigeria FG Grant: Claim your 50,000 relief disbursement urgently. Enter your BVN and NIN to verify.";

    const result = await runTrustCheck({
      userId: null,
      url: scamUrl,
      contextText,
      semanticEvidence: []
    });

    createdAnalysisIds.push(result.id);

    // Verify TrustScore Engine Integration structure
    assert.ok(result.id);
    assert.strictEqual(result.trustScore, 0);
    assert.ok(result.riskLevel === "HIGH" || result.riskLevel === "CRITICAL");
    assert.ok(Array.isArray(result.indicators));
    assert.ok(Array.isArray(result.evidence));
    assert.ok(typeof result.confidence === "number");
    assert.ok(result.confidence > 0.5);

    // Verify Scam DNA pattern match
    assert.ok(result.scamPattern);
    assert.strictEqual(result.scamPattern.matched, true);
    assert.ok(result.scamPattern.patternId);
    assert.strictEqual(
      result.scamPattern.name,
      "Government Grant Impersonation"
    );
    assert.ok(result.scamPattern.confidence >= 0.7);
    assert.ok(result.scamPattern.signals.includes("GOVERNMENT_CLAIM"));
    assert.ok(result.scamPattern.signals.includes("FINANCIAL_LURE"));
  });

  test("associates multiple related URLs with the same recurring scam campaign", async () => {
    // URL 1 in campaign
    const url1 = "https://cbn-grant-portal-alpha.xyz/verify";
    const context1 = "Federal government relief fund approval for citizens";
    const res1 = await runTrustCheck({
      url: url1,
      contextText: context1,
      semanticEvidence: ["GOVERNMENT_CLAIM", "FINANCIAL_LURE"]
    });
    createdAnalysisIds.push(res1.id);

    // URL 2 in campaign (different domain, same campaign pattern)
    const url2 = "https://cbn-fg-palliative-disbursement.top/claim";
    const context2 = "Presidential grant payout application form";
    const res2 = await runTrustCheck({
      url: url2,
      contextText: context2,
      semanticEvidence: ["GOVERNMENT_CLAIM", "FINANCIAL_LURE"]
    });
    createdAnalysisIds.push(res2.id);

    assert.strictEqual(res1.scamPattern.matched, true);
    assert.strictEqual(res2.scamPattern.matched, true);
    // Both URLs should share the exact same recurring campaign patternId!
    assert.strictEqual(res1.scamPattern.patternId, res2.scamPattern.patternId);
    assert.strictEqual(res1.scamPattern.name, res2.scamPattern.name);
  });

  test("evaluates clean URL without false certainty", async () => {
    const cleanUrl = "https://example.com/about";
    const result = await runTrustCheck({
      url: cleanUrl,
      contextText: "",
      semanticEvidence: []
    });

    createdAnalysisIds.push(result.id);

    assert.ok(result.trustScore > 70);
    assert.strictEqual(result.riskLevel, "LOW");
    assert.strictEqual(result.scamPattern.matched, false);
    assert.strictEqual(result.scamPattern.patternId, null);
    assert.strictEqual(result.scamPattern.confidence, 0);
    assert.deepStrictEqual(result.scamPattern.signals, []);
  });

  test("retrieves stored intelligence and context via getUserAnalysis", async () => {
    const targetId = createdAnalysisIds[0];
    const retrieved = await getUserAnalysis({
      analysisId: targetId,
      userId: null,
      isAdmin: true
    });

    assert.ok(retrieved);
    assert.strictEqual(retrieved.id, targetId);
    assert.strictEqual(retrieved.scamPattern.matched, true);
    assert.ok(retrieved.scamPattern.name);
  });
});
