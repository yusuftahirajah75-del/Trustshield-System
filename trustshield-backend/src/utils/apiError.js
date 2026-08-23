class ApiError extends Error {
  constructor(statusCode, message, code, fields = undefined) {
    super(message);

    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;