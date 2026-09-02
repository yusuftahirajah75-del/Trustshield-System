const express = require("express");
const authenticateOrApiKey = require("../middlewares/authenticateOrApiKey");
const validate = require("../middlewares/validate");
const {
  developerApiRateLimiter
} = require("../middlewares/rateLimiter");
const { analysisRequestSchema } = require("../validators/analysisValidator");
const { uuidSchema } = require("../validators/commonValidator");
const entitlementGuard = require("../middlewares/entitlementGuard");
const {
  checkTrust,
  getTrustAnalysis
} = require("../controllers/trustController");

const router = express.Router();

router.post(
  "/check",
  authenticateOrApiKey({ optional: false }),
  entitlementGuard,
  developerApiRateLimiter,
  validate(analysisRequestSchema),
  checkTrust
);

router.get(
  "/:id",
  authenticateOrApiKey({ optional: false }),
  developerApiRateLimiter,
  validate(uuidSchema, "params"),
  getTrustAnalysis
);

module.exports = router;
