const express = require("express");
const authenticate = require("../middlewares/authenticate");
const validate = require("../middlewares/validate");
const { uuidSchema } = require("../validators/commonValidator");
const {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  getDeveloperStats
} = require("../controllers/developerController");

const router = express.Router();

// All developer management routes require session authentication
router.use(authenticate);

router.post("/keys", createApiKey);
router.get("/keys", listApiKeys);
router.delete("/keys/:id", validate(uuidSchema, "params"), revokeApiKey);
router.get("/stats", getDeveloperStats);

module.exports = router;
