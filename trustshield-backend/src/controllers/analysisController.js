const asyncHandler =
  require("../utils/asyncHandler");

const {
  successResponse
} = require("../utils/apiResponse");

const analysisService =
  require("../services/analysisService");

const createAnalysis =
  asyncHandler(async (req, res) => {
    const analysis =
      await analysisService.createUserAnalysis({
        userId: req.user.id,
        url: req.body.url
      });

    return successResponse(
      res,
      201,
      "URL analysis completed successfully.",
      {
        analysis
      }
    );
  });

const listAnalyses =
  asyncHandler(async (req, res) => {
    const result =
      await analysisService.listUserAnalyses({
        userId: req.user.id,
        page: req.query.page,
        limit: req.query.limit
      });

    return successResponse(
      res,
      200,
      "Analysis history retrieved successfully.",
      result
    );
  });

const getAnalysis =
  asyncHandler(async (req, res) => {
    const analysis =
      await analysisService.getUserAnalysis({
        analysisId: req.params.id,
        userId: req.user.id,
        isAdmin: req.user.role === "admin"
      });

    return successResponse(
      res,
      200,
      "Analysis retrieved successfully.",
      {
        analysis
      }
    );
  });

const deleteAnalysis =
  asyncHandler(async (req, res) => {
    await analysisService.deleteUserAnalysis({
      analysisId: req.params.id,
      userId: req.user.id,
      isAdmin: req.user.role === "admin"
    });

    return successResponse(
      res,
      200,
      "Analysis deleted successfully.",
      null
    );
  });

module.exports = {
  createAnalysis,
  listAnalyses,
  getAnalysis,
  deleteAnalysis
};