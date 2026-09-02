const userRepository = require("../repositories/userRepository");
const analysisRepository = require("../repositories/analysisRepository");
const apiKeyRepository = require("../repositories/apiKeyRepository");
const scamPatternRepository = require("../repositories/scamPatternRepository");
const { sanitizeUser } = require("./authService");
const { sanitizeAnalysis } = require("./analysisService");

const getDashboard = async (userId) => {
  const [
    user,
    summary,
    recentAnalyses,
    developerStats,
    apiKeys,
    recurringCampaigns
  ] = await Promise.all([
    userRepository.findUserById(userId),
    analysisRepository.getRiskSummaryByUser(userId),
    analysisRepository.getRecentAnalysesByUser(userId, 5),
    apiKeyRepository.getDeveloperStats(userId),
    apiKeyRepository.listApiKeysByUser(userId),
    scamPatternRepository.listRecurringCampaigns(5)
  ]);

  const enrichedRecent = await Promise.all(
    recentAnalyses.map(async (analysis) => {
      const matches =
        await scamPatternRepository.getPatternMatchesByAnalysisId(analysis.id);
      return sanitizeAnalysis(analysis, matches[0] || null);
    })
  );

  return {
    user: sanitizeUser(user),
    summary,
    recentAnalyses: enrichedRecent,
    developer: {
      ...developerStats,
      activeKey: apiKeys.find((k) => k.is_active) || null,
      keysCount: apiKeys.length
    },
    recurringCampaigns
  };
};

module.exports = {
  getDashboard
};