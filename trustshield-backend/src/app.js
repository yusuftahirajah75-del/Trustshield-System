const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const corsMiddleware =
  require("./config/cors");

const {
  globalRateLimiter
} = require("./middlewares/rateLimiter");

const routes =
  require("./routes");

const notFound =
  require("./middlewares/notFound");

const errorHandler =
  require("./middlewares/errorHandler");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet());

app.use(corsMiddleware);

app.use(
  express.json({
    limit: "1mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "10kb"
  })
);

app.use(cookieParser());

app.use(globalRateLimiter);

app.use(routes);

app.use(notFound);

app.use(errorHandler);

module.exports = app;