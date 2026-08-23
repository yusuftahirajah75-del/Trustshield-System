const express = require("express");

const {
  register,
  login,
  me,
  logout
} = require("../controllers/authController");

const validate =
  require("../middlewares/validate");

const authenticate =
  require("../middlewares/authenticate");

const {
  authRateLimiter
} = require("../middlewares/rateLimiter");

const {
  registerSchema,
  loginSchema
} = require("../validators/authValidator");

const router = express.Router();

router.post(
  "/register",
  authRateLimiter,
  validate(registerSchema),
  register
);

router.post(
  "/login",
  authRateLimiter,
  validate(loginSchema),
  login
);

router.get(
  "/me",
  authenticate,
  me
);

router.post(
  "/logout",
  authenticate,
  logout
);

module.exports = router;