const analysisRepository =
  require("../repositories/analysisRepository");

const {
  analyzeUrl
} = require("./urlAnalysisService");

const {
  calculateRisk
} = require("./riskScoringService");

const ApiError =
  require("../utils/apiError");

const createAnalysis = async ({
  userId,
  url
}) => {
  const {
    normalizedUrl,
    indicators
  } = analyzeUrl(url);

  const risk =
    calculateRisk(indicators);

  const analysis =
    await analysisRepository.createAnalysis({
      userId,
      url: normalizedUrl,
      riskScore: risk.riskScore,
      riskLevel: risk.riskLevel,
      summary: risk.summary,
      indicators
    });

  return analysis;
};

const sanitizeAnalysis = (
  analysis
) => {
  return {
    id: analysis.id,
    url: analysis.url,
    riskScore: analysis.riskScore,
    riskLevel: analysis.riskLevel,
    summary: analysis.summary,
    indicators: analysis.indicators,
    createdAt: analysis.createdAt
  };
};

const createUserAnalysis = async ({
  userId,
  url
}) => {
  const analysis =
    await createAnalysis({
      userId,
      url
    });

  return sanitizeAnalysis(
    analysis
  );
};

const listUserAnalyses = async ({
  userId,
  page,
  limit
}) => {
  const offset =
    (page - 1) * limit;

  const [
    analyses,
    total
  ] = await Promise.all([
    analysisRepository.listAnalysesByUser({
      userId,
      limit,
      offset
    }),
    analysisRepository.countAnalysesByUser(
      userId
    )
  ]);

  const totalPages =
    Math.ceil(total / limit);

  return {
    analyses:
      analyses.map(
        sanitizeAnalysis
      ),

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
  userId,
  isAdmin = false
}) => {
  const analysis = isAdmin
    ? await analysisRepository.findAnalysisById(
        analysisId
      )
    : await analysisRepository.findAnalysisByIdForUser(
        analysisId,
        userId
      );

  if (!analysis) {
    throw new ApiError(
      404,
      "Analysis not found.",
      "ANALYSIS_NOT_FOUND"
    );
  }

  return sanitizeAnalysis(
    analysis
  );
};

const deleteUserAnalysis = async ({
  analysisId,
  userId,
  isAdmin = false
}) => {
  const deleted = isAdmin
    ? await analysisRepository.deleteAnalysisById(
        analysisId
      )
    : await analysisRepository.deleteAnalysisByIdForUser(
        analysisId,
        userId
      );

  if (!deleted) {
    throw new ApiError(
      404,
      "Analysis not found.",
      "ANALYSIS_NOT_FOUND"
    );
  }

  return null;
};

module.exports = {
  createUserAnalysis,
  listUserAnalyses,
  getUserAnalysis,
  deleteUserAnalysis,
  sanitizeAnalysis
};