const express = require("express");

const healthRoutes = require("./healthRoutes");
const authRoutes = require("./authRoutes");
const analysisRoutes = require("./analysisRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const trustRoutes = require("./trustRoutes");
const reportRoutes = require("./reportRoutes");
const developerRoutes = require("./developerRoutes");
const billingRoutes = require("./billingRoutes");

const router = express.Router();

router.use(healthRoutes);
router.use("/api", healthRoutes);
router.use("/api/v1/auth", authRoutes);
router.use("/api/v1/analysis", analysisRoutes);
router.use("/api/v1/dashboard", dashboardRoutes);
router.use("/api/v1/trust", trustRoutes);
router.use("/api/v1/reports", reportRoutes);
router.use("/api/v1/developer", developerRoutes);
router.use("/api/v1/billing", billingRoutes);

module.exports = router;