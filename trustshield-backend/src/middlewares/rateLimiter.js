const rateLimit = require("express-rate-limit");

const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    error: {
      code: "TOO_MANY_REQUESTS"
    }
  }
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
    error: {
      code: "TOO_MANY_REQUESTS"
    }
  }
});

const analysisRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many analysis requests. Please try again later.",
    error: {
      code: "TOO_MANY_REQUESTS"
    }
  }
});

const developerApiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: (req) => req.apiKey?.rate_limit_per_minute || 60,
  keyGenerator: (req) =>
    req.apiKey ? `apikey:${req.apiKey.id}` : req.ip || "unknown",
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: "draft-7",
  legacyHeaders: false,
  statusCode: 429,
  message: {
    success: false,
    message: "API rate limit exceeded. Please wait before retrying.",
    error: {
      code: "RATE_LIMIT_EXCEEDED"
    }
  }
});

module.exports = {
  globalRateLimiter,
  authRateLimiter,
  analysisRateLimiter,
  developerApiRateLimiter
};