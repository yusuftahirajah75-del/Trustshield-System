const asyncHandler = require("../utils/asyncHandler");
const {
  successResponse
} = require("../utils/apiResponse");
const env = require("../config/env");
const {
  testDatabaseConnection
} = require("../config/database");

const healthCheck = asyncHandler(async (req, res) => {
  await testDatabaseConnection();

  return successResponse(
    res,
    200,
    "TrustShield API is healthy.",
    {
      service: "trustshield-api",
      environment: env.nodeEnv
    }
  );
});

module.exports = {
  healthCheck
};