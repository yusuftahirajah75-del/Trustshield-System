const cors = require("cors");
const env = require("./env");

const corsOptions = {
  origin: env.clientUrl,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"]
};

module.exports = cors(corsOptions);