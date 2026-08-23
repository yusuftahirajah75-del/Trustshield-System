const ApiError = require("../utils/apiError");

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new ApiError(
          401,
          "Authentication required.",
          "UNAUTHENTICATED"
        )
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          "You do not have permission to perform this action.",
          "FORBIDDEN"
        )
      );
    }

    next();
  };
};

module.exports = authorize;