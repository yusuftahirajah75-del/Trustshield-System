const express = require("express");
const authenticateOrApiKey = require("../middlewares/authenticateOrApiKey");
const validate = require("../middlewares/validate");
const { developerApiRateLimiter } = require("../middlewares/rateLimiter");
const { reportRequestSchema } = require("../validators/analysisValidator");
const { uuidSchema } = require("../validators/commonValidator");
const {
  createReport,
  getReport,
  listReports
} = require("../controllers/reportController");

const router = express.Router();

router.post(
  "/",
  authenticateOrApiKey({ optional: false }),
  developerApiRateLimiter,
  validate(reportRequestSchema),
  createReport
);

router.get(
  "/",
  authenticateOrApiKey({ optional: true }),
  listReports
);

router.get(
  "/:id",
  authenticateOrApiKey({ optional: true }),
  validate(uuidSchema, "params"),
  getReport
);

module.exports = router;
