const { analyzeUrl } = require("./urlAnalysisService");
const { extractSignals } = require("./signalExtractionService");

const buildAnalysisSignals = ({
  url,
  contextText = "",
  semanticEvidence = []
}) => {
  const urlAnalysis = analyzeUrl(url);

  const extraction = extractSignals({
    url,
    contextText,
    semanticEvidence,
    urlIndicators: urlAnalysis.indicators
  });

  return {
    normalizedUrl: urlAnalysis.normalizedUrl,
    indicators: extraction.signals,
    evidence: extraction.evidence
  };
};

module.exports = {
  buildAnalysisSignals
};
