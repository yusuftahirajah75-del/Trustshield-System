const crypto = require("crypto");
const apiKeyRepository = require("../repositories/apiKeyRepository");
const ApiError = require("../utils/apiError");

const hashApiKey = (key) => {
  return crypto.createHash("sha256").update(key).digest("hex");
};

const generateApiKey = async ({
  userId,
  name = "Default API Key",
  rateLimitPerMinute = 60
}) => {
  const randomBytes = crypto.randomBytes(24).toString("hex");
  const rawKey = `ts_live_${randomBytes}`;
  const keyPrefix = `${rawKey.substring(0, 16)}...`;
  const keyHash = hashApiKey(rawKey);

  const keyRecord = await apiKeyRepository.createApiKey({
    userId,
    name,
    keyHash,
    keyPrefix,
    rateLimitPerMinute
  });

  return {
    id: keyRecord.id,
    name: keyRecord.name,
    keyPrefix: keyRecord.key_prefix,
    rateLimitPerMinute: keyRecord.rate_limit_per_minute,
    rawKey, // Only returned upon creation!
    createdAt: keyRecord.created_at
  };
};

const listApiKeys = async (userId) => {
  return apiKeyRepository.listApiKeysByUser(userId);
};

const revokeApiKey = async ({ id, userId }) => {
  const result = await apiKeyRepository.revokeApiKey(id, userId);
  if (!result) {
    throw new ApiError(404, "API Key not found or already revoked.", "KEY_NOT_FOUND");
  }
  return result;
};

const entitlementService = require("./entitlementService");

const getDeveloperDashboardData = async (userId) => {
  const [stats, keys, recentThreats, recentActivity, recentChecks, entitlements] =
    await Promise.all([
      apiKeyRepository.getDeveloperStats(userId),
      apiKeyRepository.listApiKeysByUser(userId),
      apiKeyRepository.getRecentThreats(userId, 10),
      apiKeyRepository.getRecentActivity(userId, 10),
      apiKeyRepository.getRecentChecks(userId, 10),
      entitlementService.getUserEntitlements(userId)
    ]);

  return {
    ...stats,
    entitlements,
    activeKey: keys.find((k) => k.is_active) || null,
    allKeys: keys,
    recentThreats,
    recentActivity,
    recentChecks
  };
};

module.exports = {
  hashApiKey,
  generateApiKey,
  listApiKeys,
  revokeApiKey,
  getDeveloperDashboardData
};
