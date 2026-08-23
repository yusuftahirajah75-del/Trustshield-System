const env = require("../config/env");
const {
  verifyAccessToken
} = require("../utils/jwt");
const ApiError = require("../utils/apiError");

const authenticate = (req, res, next) => {
  console.log("\n========== AUTH DEBUG ==========");

  try {
    const token = req.cookies?.[env.cookieName];

    console.log(
      "🔐 token:",
      token ? "TOKEN FOUND" : "TOKEN NOT FOUND"
    );

    if (!token) {
      console.log("❌ No authentication cookie found.");

      throw new ApiError(
        401,
        "Authentication required.",
        "UNAUTHENTICATED"
      );
    }

    console.log("🔍 Verifying JWT...");

    const payload = verifyAccessToken(token);

    console.log("✅ JWT payload:", payload);

    if (!payload.sub) {
      throw new ApiError(
        401,
        "Invalid authentication token.",
        "INVALID_TOKEN"
      );
    }

    req.user = {
      id: payload.sub,
      role: payload.role
    };

    console.log("👤 req.user:", req.user);

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }

    console.error("❌ Authentication error:", error);

    return next(
      new ApiError(
        401,
        "Invalid or expired authentication token.",
        "INVALID_TOKEN"
      )
    );
  }
};

module.exports = authenticate;