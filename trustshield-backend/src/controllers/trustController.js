const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/apiResponse");
const analysisService = require("../services/analysisService");

const checkTrust = asyncHandler(async (req, res) => {
  const { url, contextText, semanticEvidence } = req.body;

  const result = await analysisService.runTrustCheck({
    userId: req.user?.id || null,
    url,
    contextText: contextText || "",
    semanticEvidence: semanticEvidence || []
  });

  // Attach riskLevel to request for usage log tracker
  req.riskLevel = result.riskLevel;

  return successResponse(
    res,
    200,
    "Trust analysis completed successfully.",
    {
      requestId: result.requestId || result.id,
      id: result.id,
      url: result.url,
      trustScore: result.trustScore,
      riskLevel: result.riskLevel,
      riskScore: result.riskScore,
      indicators: result.indicators,
      evidence: result.evidence,
      confidence: result.confidence,
      scamPattern: result.scamPattern,
      patternMatch:
        result.patternMatch !== undefined
          ? result.patternMatch
          : Boolean(result.scamPattern?.matched),
      analysisTimestamp: result.analysisTimestamp || result.createdAt,
      createdAt: result.createdAt,
      summary: result.summary
    }
  );
});

const getTrustAnalysis = asyncHandler(async (req, res) => {
  const analysis = await analysisService.getUserAnalysis({
    analysisId: req.params.id,
    userId: req.user?.id || null,
    isAdmin: req.user?.role === "admin"
  });

  req.riskLevel = analysis.riskLevel;

  return successResponse(
    res,
    200,
    "Trust analysis retrieved successfully.",
    {
      requestId: analysis.requestId || analysis.id,
      id: analysis.id,
      url: analysis.url,
      trustScore: analysis.trustScore,
      riskLevel: analysis.riskLevel,
      riskScore: analysis.riskScore,
      indicators: analysis.indicators,
      evidence: analysis.evidence,
      confidence: analysis.confidence,
      scamDNA: analysis.scamDna || analysis.scamPattern,
      scamPattern: analysis.scamPattern,
      patternMatches: analysis.patternMatches || [],
      analysisContext: analysis.analysisContext || null,
      contextText: analysis.contextText || null,
      timestamp: analysis.timestamp || analysis.createdAt,
      createdAt: analysis.createdAt,
      summary: analysis.summary
    }
  );
});

module.exports = {
  checkTrust,
  getTrustAnalysis
};
