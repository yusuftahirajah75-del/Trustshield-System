const ApiError = require("../utils/apiError");

const errorHandler = (
  err,
  req,
  res,
  next
) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    console.error(error);

    error = new ApiError(
      500,
      "An unexpected server error occurred.",
      "INTERNAL_SERVER_ERROR"
    );
  }

  const response = {
    success: false,
    message: error.message,
    error: {
      code: error.code
    }
  };

  if (error.fields) {
    response.error.fields = error.fields;
  }

  return res
    .status(error.statusCode)
    .json(response);
};

module.exports = errorHandler;