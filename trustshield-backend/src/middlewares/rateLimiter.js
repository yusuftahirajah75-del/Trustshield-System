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

module.exports = {
  globalRateLimiter,
  authRateLimiter,
  analysisRateLimiter
};