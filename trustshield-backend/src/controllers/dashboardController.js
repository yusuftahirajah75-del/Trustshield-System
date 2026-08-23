const asyncHandler =
  require("../utils/asyncHandler");

const {
  successResponse
} = require("../utils/apiResponse");

const dashboardService =
  require("../services/dashboardService");

const getDashboard =
  asyncHandler(async (req, res) => {
    const dashboard =
      await dashboardService.getDashboard(
        req.user.id
      );

    return successResponse(
      res,
      200,
      "Dashboard data retrieved successfully.",
      dashboard
    );
  });

module.exports = {
  getDashboard
};