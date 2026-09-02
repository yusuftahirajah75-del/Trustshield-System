const fs = require("fs");
const path = require("path");
const { pool } = require("../config/database");

const runMigrations = async () => {
  const client = await pool.connect();

  try {
    console.log("🚀 Initializing migration runner...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrationsDir = path.join(__dirname, "migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    const executedRes = await client.query(
      "SELECT filename FROM schema_migrations"
    );
    const executed = new Set(executedRes.rows.map((r) => r.filename));

    for (const file of files) {
      if (executed.has(file)) {
        console.log(`⏩ Already applied: ${file}`);
        continue;
      }

      console.log(`⚡ Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf-8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        console.log(`✅ Successfully applied: ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`❌ Migration failed: ${file}`, err);
        throw err;
      }
    }

    console.log("🎉 All migrations executed successfully.");
  } catch (error) {
    console.error("Migration error:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
