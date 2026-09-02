const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { pool, query } = require("../src/config/database");
const scamPatternRepository = require("../src/repositories/scamPatternRepository");
const analysisContextRepository = require("../src/repositories/analysisContextRepository");
const analysisRepository = require("../src/repositories/analysisRepository");

describe("Scam Pattern Database Persistence & Intelligence", () => {
  let testPatternId;
  let testAnalysisId;

  before(async () => {
    // Create an analysis record for testing
    const analysis = await analysisRepository.createAnalysis({
      userId: null,
      url: "https://test-scam-campaign-portal.top/login",
      riskScore: 85,
      riskLevel: "high",
      summary: "High risk scam pattern detected",
      indicators: [{ code: "SUSPICIOUS_TLD", score: 15 }]
    });
    testAnalysisId = analysis.id;
  });

  after(async () => {
    // Clean up created records
    if (testAnalysisId) {
      await query("DELETE FROM analyses WHERE id = $1", [testAnalysisId]);
    }
    if (testPatternId) {
      await query("DELETE FROM scam_patterns WHERE id = $1", [testPatternId]);
    }
    await pool.end();
  });

  test("creates a new scam pattern with signals", async () => {
    const code = `TEST-CAMP-${Date.now()}`;
    const pattern = await scamPatternRepository.createPattern({
      patternCode: code,
      patternName: "Automated Campaign Test Pattern",
      countryCode: "NG",
      category: "financial_scam",
      description: "Test scam campaign for persistence verification",
      severity: "high",
      recommendation: "AVOID",
      signals: [
        { signalCode: "GOVERNMENT_CLAIM", required: true, weight: 3.0 },
        { signalCode: "FINANCIAL_LURE", required: true, weight: 2.5 }
      ]
    });

    assert.ok(pattern);
    assert.strictEqual(pattern.patternCode, code);
    assert.strictEqual(pattern.signals.length, 2);
    testPatternId = pattern.id;
  });

  test("persists analysis_context with JSONB signals", async () => {
    const context = await analysisContextRepository.saveAnalysisContext({
      analysisId: testAnalysisId,
      contextText: "Free grant money transfer for citizens",
      extractedSignals: { signals: ["GOVERNMENT_CLAIM", "FINANCIAL_LURE"], count: 2 },
      language: "en"
    });

    assert.ok(context);
    assert.strictEqual(context.analysis_id, testAnalysisId);
    assert.strictEqual(context.context_text, "Free grant money transfer for citizens");

    const fetched = await analysisContextRepository.findContextByAnalysisId(testAnalysisId);
    assert.ok(fetched);
    assert.strictEqual(fetched.id, context.id);
  });

  test("persists scam_pattern_matches and retrieves by analysisId", async () => {
    const match = await scamPatternRepository.savePatternMatch({
      analysisId: testAnalysisId,
      patternId: testPatternId,
      confidence: 0.88,
      matchedSignals: ["GOVERNMENT_CLAIM", "FINANCIAL_LURE"]
    });

    assert.ok(match);
    assert.strictEqual(match.analysis_id, testAnalysisId);
    assert.strictEqual(match.pattern_id, testPatternId);
    assert.strictEqual(Number(match.confidence), 0.88);

    const matches = await scamPatternRepository.getPatternMatchesByAnalysisId(testAnalysisId);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].patternId, testPatternId);
    assert.strictEqual(matches[0].confidence, 0.88);
  });

  test("retrieves campaign statistics for pattern", async () => {
    const stats = await scamPatternRepository.getCampaignStats(testPatternId);
    assert.ok(stats);
    assert.ok(stats.matchCount >= 1);
    assert.ok(stats.firstSeen !== null);
  });
});
