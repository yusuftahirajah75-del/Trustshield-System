const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/apiResponse");
const reportService = require("../services/reportService");

const createReport = asyncHandler(async (req, res) => {
  const { url, category, description, evidence } = req.body;

  const result = await reportService.submitScamReport({
    userId: req.user?.id || null,
    url,
    category: category || "phishing",
    description: description || "",
    evidence: evidence || []
  });

  if (result.associatedPattern) {
    req.riskLevel = "high";
  }

  return successResponse(
    res,
    201,
    "Scam report submitted successfully. Threat intelligence recorded.",
    result
  );
});

const getReport = asyncHandler(async (req, res) => {
  const report = await reportService.getReport(req.params.id);
  if (!report) {
    return res.status(404).json({
      success: false,
      message: "Report not found."
    });
  }

  return successResponse(res, 200, "Report retrieved successfully.", report);
});

const listReports = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const offset = (page - 1) * limit;

  const reports = await reportService.listUserReports({
    userId: req.user?.id || null,
    limit,
    offset
  });

  return successResponse(res, 200, "Reports retrieved successfully.", {
    reports,
    pagination: { page, limit }
  });
});

module.exports = {
  createReport,
  getReport,
  listReports
};
