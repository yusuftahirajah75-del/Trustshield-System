const RISK_LEVELS = require("../constants/riskLevels");

const calculateRiskScore = (indicators) => {
  const rawScore = indicators.reduce(
    (total, indicator) => {
      return total + indicator.score;
    },
    0
  );

  return Math.min(rawScore, 100);
};

const getRiskLevel = (score) => {
  if (score <= 29) {
    return RISK_LEVELS.LOW;
  }

  if (score <= 59) {
    return RISK_LEVELS.MEDIUM;
  }

  if (score <= 79) {
    return RISK_LEVELS.HIGH;
  }

  return RISK_LEVELS.CRITICAL;
};

const generateSummary = (
  score,
  indicators
) => {
  if (indicators.length === 0) {
    return "No significant warning indicators were detected.";
  }

  if (score <= 29) {
    return "Minor warning indicators were detected.";
  }

  if (score <= 59) {
    return "Several warning indicators were detected. Additional caution is recommended.";
  }

  if (score <= 79) {
    return "Multiple significant warning indicators were detected. Proceed with high caution.";
  }

  return "Multiple critical warning indicators were detected. Avoid interacting with the URL until it has been independently verified.";
};

const calculateRisk = (indicators) => {
  const score =
    calculateRiskScore(indicators);

  const riskLevel =
    getRiskLevel(score);

  const summary =
    generateSummary(
      score,
      indicators
    );

  return {
    riskScore: score,
    riskLevel,
    summary
  };
};

module.exports = {
  calculateRiskScore,
  getRiskLevel,
  generateSummary,
  calculateRisk
};