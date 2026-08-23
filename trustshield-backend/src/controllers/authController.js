const asyncHandler = require("../utils/asyncHandler");
const {
  successResponse
} = require("../utils/apiResponse");
const authService = require("../services/authService");
const {
  setAuthCookie,
  clearAuthCookie
} = require("../utils/cookies");

const register = asyncHandler(async (req, res) => {
  const result =
    await authService.register(req.body);

  return successResponse(
    res,
    201,
    "Account created successfully.",
    result
  );
});

const login = asyncHandler(async (req, res) => {
  const result =
    await authService.login(req.body);

  setAuthCookie(res, result.token);

  return successResponse(
    res,
    200,
    "Login successful.",
    {
      user: result.user
    }
  );
});

const me = asyncHandler(async (req, res) => {
  const user =
    await authService.getCurrentUser(req.user.id);

  return successResponse(
    res,
    200,
    "Authenticated user retrieved successfully.",
    {
      user
    }
  );
});

const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);

  return successResponse(
    res,
    200,
    "Logout successful.",
    null
  );
});

module.exports = {
  register,
  login,
  me,
  logout
};