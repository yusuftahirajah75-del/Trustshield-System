const ApiError = require("../utils/apiError");

const notFound = (req, res, next) => {
  next(
    new ApiError(
      404,
      "The requested resource was not found.",
      "NOT_FOUND"
    )
  );
};

module.exports = notFound;