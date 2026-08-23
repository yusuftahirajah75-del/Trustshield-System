const express = require("express");

const healthRoutes =
  require("./healthRoutes");

const authRoutes =
  require("./authRoutes");

const analysisRoutes =
  require("./analysisRoutes");

const dashboardRoutes =
  require("./dashboardRoutes");

const router = express.Router();

router.use(
  "/api",
  healthRoutes
);

router.use(
  "/api/v1/auth",
  authRoutes
);

router.use(
  "/api/v1/analysis",
  analysisRoutes
);

router.use(
  "/api/v1/dashboard",
  dashboardRoutes
);

module.exports = router;