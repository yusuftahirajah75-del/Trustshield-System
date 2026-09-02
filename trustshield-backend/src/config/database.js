const { Pool } = require("pg");
const env = require("./env");

const useSsl =
  process.env.DB_SSL === "true" ||
  (env.nodeEnv === "production" && Boolean(env.databaseUrl));

const poolConfig = env.databaseUrl
  ? {
      connectionString: env.databaseUrl,
      ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {})
    }
  : {
      host: env.dbHost,
      port: env.dbPort,
      database: env.dbName,
      user: env.dbUser,
      password: env.dbPassword,
      ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {})
    };

const pool = new Pool({
  ...poolConfig,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

const query = (text, params) => {
  return pool.query(text, params);
};

const testDatabaseConnection = async () => {
  const result = await pool.query("SELECT NOW() AS current_time");

  return result.rows[0];
};

module.exports = {
  pool,
  query,
  testDatabaseConnection
};