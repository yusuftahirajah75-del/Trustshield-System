const express = require("express");

const {
  createAnalysis,
  listAnalyses,
  getAnalysis,
  deleteAnalysis
} = require("../controllers/analysisController");

const authenticate =
  require("../middlewares/authenticate");

const validate =
  require("../middlewares/validate");

const {
  analysisRateLimiter
} = require("../middlewares/rateLimiter");

const {
  analysisRequestSchema,
  analysisListQuerySchema
} = require("../validators/analysisValidator");

const {
  uuidSchema
} = require("../validators/commonValidator");

const router = express.Router();

router.post(
  "/",
  authenticate,
  analysisRateLimiter,
  validate(analysisRequestSchema),
  createAnalysis
);

router.get(
  "/",
  authenticate,
  validate(
    analysisListQuerySchema,
    "query"
  ),
  listAnalyses
);

router.get(
  "/:id",
  authenticate,
  validate(uuidSchema, "params"),
  getAnalysis
);

router.delete(
  "/:id",
  authenticate,
  validate(uuidSchema, "params"),
  deleteAnalysis
);
//


module.exports = router;