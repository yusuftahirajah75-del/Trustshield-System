const analysisRepository = require("../repositories/analysisRepository");
const analysisContextRepository = require("../repositories/analysisContextRepository");
const scamPatternRepository = require("../repositories/scamPatternRepository");
const { analyzeUrl } = require("./urlAnalysisService");
const { calculateRisk } = require("./riskScoringService");
const { extractSignals } = require("./signalExtractionService");
const { resolvePrimaryScamPattern } = require("./scamDnaMatcherService");
const ApiError = require("../utils/apiError");

/**
 * Runs the full TrustShield Intelligence pipeline:
 * URL -> Existing URL Analyzer -> TrustScore Engine -> Signal Extraction -> Scam DNA Matching -> Persist -> Return explainable result
 */
const runTrustCheck = async ({
  userId = null,
  url,
  contextText = "",
  semanticEvidence = []
}) => {
  // 1. Existing URL Analyzer
  const urlAnalysis = analyzeUrl(url);

  // 2. Deterministic Signal Extraction
  const extraction = extractSignals({
    url,
    contextText,
    semanticEvidence,
    urlIndicators: urlAnalysis.indicators
  });

  // 3. Scam DNA Matching
  const enabledPatterns =
    await scamPatternRepository.findEnabledPatternsWithSignals();

  const { scamPattern, matches } = resolvePrimaryScamPattern({
    indicators: extraction.signals,
    patterns: enabledPatterns
  });

  // 4. TrustScore Engine (calculateRisk)
  const combinedIndicators = [...urlAnalysis.indicators];
  if (scamPattern.matched) {
    // Add pattern match as high-severity indicator if not already present
    combinedIndicators.push({
      code: "RECURRING_SCAM_CAMPAIGN",
      title: `Recurring Scam Campaign: ${scamPattern.name}`,
      description: `URL matches deterministic Scam DNA pattern (${scamPattern.signals.join(", ")})`,
      severity: "critical",
      score: 35
    });
  }

  const risk = calculateRisk(combinedIndicators);

  if (scamPattern.matched) {
    risk.riskScore = Math.max(risk.riskScore, 75);
    risk.riskLevel = risk.riskScore >= 80 ? "critical" : "high";
    risk.summary = `Recurring scam campaign match detected (${scamPattern.name}). ${risk.summary}`;
  }

  // Derive trustScore (0 - 100): High risk scams yield 0 trustScore
  let trustScore = Math.max(0, 100 - risk.riskScore);
  if (
    risk.riskLevel.toLowerCase() === "critical" ||
    (risk.riskLevel.toLowerCase() === "high" && scamPattern.matched)
  ) {
    trustScore = 0;
  }

  // Derive overall confidence score (0.00 to 1.00)
  const confidence = scamPattern.matched
    ? scamPattern.confidence
    : Number(
        Math.min(
          0.95,
          Math.max(0.5, 0.4 + urlAnalysis.indicators.length * 0.1)
        ).toFixed(2)
      );

  // 5. Persist Analysis
  const analysis = await analysisRepository.createAnalysis({
    userId,
    url: urlAnalysis.normalizedUrl,
    riskScore: risk.riskScore,
    riskLevel: risk.riskLevel,
    summary: risk.summary,
    indicators: combinedIndicators
  });

  // 6. Persist Context & Extracted Signals
  await analysisContextRepository.saveAnalysisContext({
    analysisId: analysis.id,
    contextText,
    extractedSignals: {
      signals: extraction.signalCodes,
      count: extraction.signalCodes.length,
      evidence: extraction.evidence
    },
    language: "en"
  });

  // 7. Persist Pattern Match
  if (scamPattern.matched && scamPattern.patternId) {
    await scamPatternRepository.savePatternMatch({
      analysisId: analysis.id,
      patternId: scamPattern.patternId,
      confidence: scamPattern.confidence,
      matchedSignals: scamPattern.signals
    });
  }

  return {
    id: analysis.id,
    requestId: analysis.id,
    url: analysis.url,
    trustScore,
    riskScore: analysis.riskScore,
    riskLevel: analysis.riskLevel.toUpperCase(),
    summary: analysis.summary,
    indicators: analysis.indicators,
    evidence: extraction.evidence,
    confidence,
    scamPattern,
    patternMatch: scamPattern.matched,
    analysisTimestamp: analysis.createdAt,
    allMatches: matches,
    createdAt: analysis.createdAt
  };
};

const sanitizeAnalysis = (analysis, patternMatch = null, context = null, allMatches = []) => {
  const riskScore = analysis.riskScore || 0;
  const isHighOrCritical =
    String(analysis.riskLevel).toLowerCase() === "high" ||
    String(analysis.riskLevel).toLowerCase() === "critical";

  const trustScore =
    isHighOrCritical && patternMatch
      ? 0
      : Math.max(0, 100 - riskScore);

  const scamPattern = patternMatch
    ? {
        matched: true,
        patternId: patternMatch.patternId,
        name: patternMatch.patternName,
        confidence: patternMatch.confidence,
        signals: patternMatch.matchedSignals || []
      }
    : {
        matched: false,
        patternId: null,
        name: null,
        confidence: 0,
        signals: []
      };

  const evidence =
    context?.extracted_signals?.evidence ||
    (Array.isArray(analysis.indicators)
      ? analysis.indicators.map((ind) => ({
          code: ind.code,
          type: "indicator",
          title: ind.title || ind.code,
          description: ind.description || "",
          severity: ind.severity || "info"
        }))
      : []);

  return {
    id: analysis.id,
    requestId: analysis.id,
    url: analysis.url,
    trustScore,
    riskScore: analysis.riskScore,
    riskLevel: String(analysis.riskLevel).toUpperCase(),
    summary: analysis.summary,
    indicators: analysis.indicators,
    evidence,
    confidence: scamPattern.matched ? scamPattern.confidence : 0.8,
    scamPattern,
    scamDna: scamPattern,
    patternMatches: allMatches.length > 0 ? allMatches : (patternMatch ? [patternMatch] : []),
    analysisContext: context
      ? {
          contextText: context.context_text,
          extractedSignals: context.extracted_signals,
          language: context.language
        }
      : null,
    contextText: context?.context_text || null,
    timestamp: analysis.createdAt,
    createdAt: analysis.createdAt
  };
};

const createUserAnalysis = async ({
  userId,
  url,
  contextText = "",
  semanticEvidence = []
}) => {
  return runTrustCheck({
    userId,
    url,
    contextText,
    semanticEvidence
  });
};

const listUserAnalyses = async ({ userId, page, limit }) => {
  const offset = (page - 1) * limit;

  const [analyses, total] = await Promise.all([
    analysisRepository.listAnalysesByUser({
      userId,
      limit,
      offset
    }),
    analysisRepository.countAnalysesByUser(userId)
  ]);

  const totalPages = Math.ceil(total / limit);

  // Enrich with pattern matches
  const enrichedAnalyses = await Promise.all(
    analyses.map(async (analysis) => {
      const matches =
        await scamPatternRepository.getPatternMatchesByAnalysisId(analysis.id);
      return sanitizeAnalysis(analysis, matches[0] || null, null, matches);
    })
  );

  return {
    analyses: enrichedAnalyses,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  };
};

const getUserAnalysis = async ({
  analysisId,
  userId = null,
  isAdmin = false
}) => {
  const analysis = isAdmin || !userId
    ? await analysisRepository.findAnalysisById(analysisId)
    : await analysisRepository.findAnalysisByIdForUser(analysisId, userId);

  if (!analysis) {
    throw new ApiError(404, "Analysis not found.", "ANALYSIS_NOT_FOUND");
  }

  const [matches, context] = await Promise.all([
    scamPatternRepository.getPatternMatchesByAnalysisId(analysis.id),
    analysisContextRepository.findContextByAnalysisId(analysis.id)
  ]);

  return sanitizeAnalysis(analysis, matches[0] || null, context, matches);
};

const deleteUserAnalysis = async ({
  analysisId,
  userId,
  isAdmin = false
}) => {
  const deleted = isAdmin
    ? await analysisRepository.deleteAnalysisById(analysisId)
    : await analysisRepository.deleteAnalysisByIdForUser(analysisId, userId);

  if (!deleted) {
    throw new ApiError(404, "Analysis not found.", "ANALYSIS_NOT_FOUND");
  }

  return null;
};

module.exports = {
  runTrustCheck,
  createUserAnalysis,
  listUserAnalyses,
  getUserAnalysis,
  deleteUserAnalysis,
  sanitizeAnalysis
};