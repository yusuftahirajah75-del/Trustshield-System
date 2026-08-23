const env = require("../config/env");

const getCookieOptions = () => {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    maxAge: 15 * 60 * 1000,
    path: "/"
  };
};

const setAuthCookie = (res, token) => {
  res.cookie(
    env.cookieName,
    token,
    getCookieOptions()
  );
};

const clearAuthCookie = (res) => {
  res.clearCookie(
    env.cookieName,
    {
      httpOnly: true,
      secure: env.cookieSecure,
      sameSite: env.cookieSameSite,
      path: "/"
    }
  );
};

module.exports = {
  getCookieOptions,
  setAuthCookie,
  clearAuthCookie
};