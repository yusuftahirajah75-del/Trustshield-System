const app = require("./app");
const env = require("./config/env");
const {
  testDatabaseConnection
} = require("./config/database");

const startServer = async () => {
  try {
    await testDatabaseConnection();

    console.log(
      "✅ PostgreSQL Connected Successfully"
    );

    app.listen(env.port, () => {
      console.log(
        `🚀 TrustShield API running on port ${env.port}`
      );

      console.log(
        `🌐 Environment: ${env.nodeEnv}`
      );

      console.log(
        `🔗 Frontend: ${env.clientUrl}`
      );
    });
  } catch (error) {
    console.error(
      "❌ Failed to start TrustShield API:"
    );

    console.error(error);

    process.exit(1);
  }
};

startServer();