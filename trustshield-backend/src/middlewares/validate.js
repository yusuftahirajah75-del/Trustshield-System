const ApiError = require("../utils/apiError");

const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const fields = {};

      for (const issue of result.error.issues) {
        const field = issue.path.join(".");

        if (!fields[field]) {
          fields[field] = issue.message;
        }
      }

      return next(
        new ApiError(
          422,
          "Validation failed.",
          "VALIDATION_ERROR",
          fields
        )
      );
    }

    req[source] = result.data;

    next();
  };
};

module.exports = validate;