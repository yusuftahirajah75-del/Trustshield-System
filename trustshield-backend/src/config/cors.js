const cors = require("cors");
const env = require("./env");

const corsOptions = {
  origin: env.clientUrl,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "x-api-key", "x-requested-with"]
};

module.exports = cors(corsOptions);