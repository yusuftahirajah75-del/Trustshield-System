const userRepository =
  require("../repositories/userRepository");

const analysisRepository =
  require("../repositories/analysisRepository");

const {
  sanitizeUser
} = require("./authService");

const {
  sanitizeAnalysis
} = require("./analysisService");

const getDashboard = async (
  userId
) => {
  const [
    user,
    summary,
    recentAnalyses
  ] = await Promise.all([
    userRepository.findUserById(
      userId
    ),

    analysisRepository.getRiskSummaryByUser(
      userId
    ),

    analysisRepository.getRecentAnalysesByUser(
      userId,
      5
    )
  ]);

  return {
    user: sanitizeUser(user),

    summary,

    recentAnalyses:
      recentAnalyses.map(
        sanitizeAnalysis
      )
  };
};

module.exports = {
  getDashboard
};