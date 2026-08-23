const { Pool } = require("pg");
const env = require("./env");

const poolConfig = env.databaseUrl
  ? {
      connectionString: env.databaseUrl
    }
  : {
      host: env.dbHost,
      port: env.dbPort,
      database: env.dbName,
      user: env.dbUser,
      password: env.dbPassword
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