const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/apiResponse");
const developerService = require("../services/developerService");

const createApiKey = asyncHandler(async (req, res) => {
  const { name, rateLimitPerMinute } = req.body || {};
  const result = await developerService.generateApiKey({
    userId: req.user.id,
    name: name || "TrustShield Developer Key",
    rateLimitPerMinute: rateLimitPerMinute ? Number(rateLimitPerMinute) : 60
  });

  return successResponse(
    res,
    201,
    "API Key generated successfully. Save this secret key securely; it will not be shown again.",
    { apiKey: result }
  );
});

const listApiKeys = asyncHandler(async (req, res) => {
  const keys = await developerService.listApiKeys(req.user.id);
  return successResponse(res, 200, "API Keys retrieved successfully.", { keys });
});

const revokeApiKey = asyncHandler(async (req, res) => {
  const result = await developerService.revokeApiKey({
    id: req.params.id,
    userId: req.user.id
  });

  return successResponse(res, 200, "API Key revoked successfully.", {
    revokedKey: result
  });
});

const getDeveloperStats = asyncHandler(async (req, res) => {
  const stats = await developerService.getDeveloperDashboardData(req.user.id);
  return successResponse(
    res,
    200,
    "Developer stats retrieved successfully.",
    stats
  );
});

module.exports = {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  getDeveloperStats
};
