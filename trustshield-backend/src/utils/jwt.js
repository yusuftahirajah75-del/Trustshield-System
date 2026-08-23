const jwt = require("jsonwebtoken");
const env = require("../config/env");

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn
    }
  );
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwtSecret);
};

module.exports = {
  generateAccessToken,
  verifyAccessToken
};