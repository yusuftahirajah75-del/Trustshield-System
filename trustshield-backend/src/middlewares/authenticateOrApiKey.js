const env = require("../config/env");
const { verifyAccessToken } = require("../utils/jwt");
const apiKeyRepository = require("../repositories/apiKeyRepository");
const { hashApiKey } = require("../services/developerService");
const ApiError = require("../utils/apiError");

/**
 * Hybrid authentication middleware:
 * Checks for API Key in headers first, then falls back to cookie JWT session.
 * If neither is present, allows optional continuation if optional = true, else throws 401.
 */
const authenticateOrApiKey = (options = { optional: false }) => {
  return async (req, res, next) => {
    const startTime = Date.now();

    // 1. Check for API key in headers
    const authHeader = req.headers.authorization;
    const apiKeyHeader =
      req.headers["x-api-key"] ||
      (authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : authHeader && authHeader.startsWith("ts_live_")
          ? authHeader.trim()
          : null);

    if (apiKeyHeader) {
      const keyHash = hashApiKey(apiKeyHeader.trim());
      const keyRecord = await apiKeyRepository.findApiKeyByHash(keyHash);

      if (!keyRecord) {
        return next(new ApiError(401, "Invalid or revoked API Key.", "INVALID_API_KEY"));
      }

      req.apiKey = keyRecord;
      req.user = {
        id: keyRecord.user_id,
        role: "developer"
      };

      apiKeyRepository.updateLastUsed(keyRecord.id).catch(() => {});

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

      return next();
    }

    // 2. Check for cookie session
    const token = req.cookies?.[env.cookieName];
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        if (payload?.sub) {
          req.user = {
            id: payload.sub,
            role: payload.role
          };

          res.on("finish", () => {
            const duration = Date.now() - startTime;
            const isThreat =
              res.statusCode < 400 &&
              req.riskLevel &&
              ["high", "critical"].includes(String(req.riskLevel).toLowerCase());

            apiKeyRepository
              .logApiUsage({
                apiKeyId: null,
                userId: payload.sub,
                endpoint: req.originalUrl || req.baseUrl,
                method: req.method,
                statusCode: res.statusCode,
                riskLevel: req.riskLevel || null,
                isThreat: Boolean(isThreat),
                ipAddress: req.ip || req.connection?.remoteAddress,
                responseTimeMs: duration
              })
              .catch((err) => {
                console.error("Failed to log session API usage:", err);
              });
          });

          return next();
        }
      } catch {
        // Token invalid, fall through
      }
    }

    // 3. Optional vs required auth
    if (options.optional) {
      req.user = null;
      return next();
    }

    return next(
      new ApiError(
        401,
        "Authentication required via API Key (x-api-key) or active session.",
        "UNAUTHENTICATED"
      )
    );
  };
};

module.exports = authenticateOrApiKey;
