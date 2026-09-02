const apiKeyRepository = require("../repositories/apiKeyRepository");
const { hashApiKey } = require("../services/developerService");
const ApiError = require("../utils/apiError");

const apiKeyAuth = async (req, res, next) => {
  const startTime = Date.now();
  const authHeader = req.headers.authorization;
  const apiKeyHeader =
    req.headers["x-api-key"] ||
    (authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : authHeader && authHeader.startsWith("ts_live_")
        ? authHeader.trim()
        : null);

  if (!apiKeyHeader) {
    return next(
      new ApiError(401, "API Key required in x-api-key header or Bearer token.", "API_KEY_REQUIRED")
    );
  }

  const keyHash = hashApiKey(apiKeyHeader.trim());
  const keyRecord = await apiKeyRepository.findApiKeyByHash(keyHash);

  if (!keyRecord) {
    return next(new ApiError(401, "Invalid or revoked API Key.", "INVALID_API_KEY"));
  }

  // Attach to request
  req.apiKey = keyRecord;
  req.user = {
    id: keyRecord.user_id,
    role: "developer"
  };

  // Update last used timestamp asynchronously
  apiKeyRepository.updateLastUsed(keyRecord.id).catch(() => {});

  // Intercept response to log usage
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const isThreat =
      res.statusCode < 400 &&
      req.riskLevel &&
      ["high", "critical"].includes(String(req.riskLevel).toLowerCase());

    apiKeyRepository
      .logApiUsage({
        apiKeyId: keyRecord.id,
        userId: keyRecord.user_id,
        endpoint: req.originalUrl || req.baseUrl,
        method: req.method,
        statusCode: res.statusCode,
        riskLevel: req.riskLevel || null,
        isThreat: Boolean(isThreat),
        ipAddress: req.ip || req.connection?.remoteAddress,
        responseTimeMs: duration
      })
      .catch((err) => {
        console.error("Failed to log API usage:", err);
      });
  });

  next();
};

module.exports = apiKeyAuth;
