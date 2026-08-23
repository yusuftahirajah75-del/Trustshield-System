const dotenv = require("dotenv");

dotenv.config();

const requiredEnv = [
  "PORT",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "CLIENT_URL",
  "COOKIE_NAME"
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",

  port: Number(process.env.PORT),

  databaseUrl: process.env.DATABASE_URL || null,

  dbHost: process.env.DB_HOST || "localhost",
  dbPort: Number(process.env.DB_PORT || 5432),
  dbName: process.env.DB_NAME || "trustshield",
  dbUser: process.env.DB_USER || "postgres",
  dbPassword: process.env.DB_PASSWORD || "",

  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,

  clientUrl: process.env.CLIENT_URL,

  cookieName: process.env.COOKIE_NAME,

  cookieSecure:
    String(process.env.COOKIE_SECURE).toLowerCase() === "true",

  cookieSameSite: process.env.COOKIE_SAME_SITE || "lax"
};

module.exports = env;