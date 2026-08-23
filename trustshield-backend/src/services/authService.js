const userRepository = require("../repositories/userRepository");
const {
  hashPassword,
  comparePassword
} = require("../utils/password");
const {
  generateAccessToken
} = require("../utils/jwt");
const ApiError = require("../utils/apiError");
const ROLES = require("../constants/roles");

const sanitizeUser = (user) => {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    role: user.role,
    isActive: user.is_active,
    createdAt: user.created_at
  };
};

const register = async ({
  firstName,
  lastName,
  email,
  password
}) => {
  const existingUser =
    await userRepository.findUserByEmail(email);

  if (existingUser) {
    throw new ApiError(
      409,
      "An account with this email already exists.",
      "EMAIL_ALREADY_EXISTS"
    );
  }

  const passwordHash = await hashPassword(password);

  try {
    const user = await userRepository.createUser({
      firstName,
      lastName,
      email,
      passwordHash,
      role: ROLES.USER
    });

    return {
      user: sanitizeUser(user)
    };
  } catch (error) {
    if (error.code === "23505") {
      throw new ApiError(
        409,
        "An account with this email already exists.",
        "EMAIL_ALREADY_EXISTS"
      );
    }

    throw error;
  }
};

const login = async ({ email, password }) => {
  const user =
    await userRepository.findUserByEmail(email);

  if (!user) {
    throw new ApiError(
      401,
      "Invalid email or password.",
      "INVALID_CREDENTIALS"
    );
  }

  const passwordMatches =
    await comparePassword(
      password,
      user.password_hash
    );

  if (!passwordMatches) {
    throw new ApiError(
      401,
      "Invalid email or password.",
      "INVALID_CREDENTIALS"
    );
  }

  if (!user.is_active) {
    throw new ApiError(
      403,
      "This account is inactive.",
      "ACCOUNT_INACTIVE"
    );
  }

  const token = generateAccessToken(user);

  return {
    token,
    user: sanitizeUser(user)
  };
};

const getCurrentUser = async (userId) => {
  const user =
    await userRepository.findUserById(userId);

  if (!user) {
    throw new ApiError(
      401,
      "Authentication required.",
      "UNAUTHENTICATED"
    );
  }

  if (!user.is_active) {
    throw new ApiError(
      403,
      "This account is inactive.",
      "ACCOUNT_INACTIVE"
    );
  }

  return sanitizeUser(user);
};

module.exports = {
  register,
  login,
  getCurrentUser,
  sanitizeUser
};