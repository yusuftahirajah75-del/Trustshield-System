const reportRepository = require("../repositories/reportRepository");
const scamPatternRepository = require("../repositories/scamPatternRepository");
const { analyzeUrl } = require("./urlAnalysisService");
const { extractSignals } = require("./signalExtractionService");
const { resolvePrimaryScamPattern } = require("./scamDnaMatcherService");

const submitScamReport = async ({
  userId = null,
  url,
  category = "phishing",
  description = "",
  evidence = []
}) => {
  // 1. Analyze URL
  let urlIndicators = [];
  try {
    const analysis = analyzeUrl(url);
    urlIndicators = analysis.indicators;
  } catch {
    // Graceful fallback for non-standard formats
  }

  // 2. Extract signals from URL, description, and caller evidence
  const extraction = extractSignals({
    url,
    contextText: description,
    semanticEvidence: evidence,
    urlIndicators
  });

  // 3. Match against existing scam patterns to identify campaign linkage
  const enabledPatterns =
    await scamPatternRepository.findEnabledPatternsWithSignals();

  const { scamPattern } = resolvePrimaryScamPattern({
    indicators: extraction.signals,
    patterns: enabledPatterns
  });

  // 4. Persist the report
  const report = await reportRepository.createReport({
    userId,
    url,
    category,
    description,
    evidence: extraction.evidence,
    patternId: scamPattern.matched ? scamPattern.patternId : null
  });

  return {
    id: report.id,
    url: report.url,
    category: report.category,
    status: report.status,
    associatedPattern: scamPattern.matched
      ? {
          patternId: scamPattern.patternId,
          name: scamPattern.name,
          confidence: scamPattern.confidence
        }
      : null,
    extractedSignals: extraction.signalCodes,
    createdAt: report.created_at
  };
};

const getReport = async (reportId) => {
  const report = await reportRepository.findReportById(reportId);
  return report;
};

const listUserReports = async ({ userId, limit, offset }) => {
  return reportRepository.listReports({ userId, limit, offset });
};

module.exports = {
  submitScamReport,
  getReport,
  listUserReports
};
