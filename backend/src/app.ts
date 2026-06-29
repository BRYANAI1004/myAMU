import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { workersDbMiddleware } from "./lib/db.js";
import { workersJsonBodyParser } from "./middleware/workersJsonBody.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

const isWorkersRuntime =
  process.env.USE_HYPERDRIVE === "1" && process.env.NODE_ENV === "production";

/** Browser origins allowed for CORS (production + local Vite; env merges extra hosts). */
const requiredCorsOrigins = new Set([
  "https://myamu.wanpanel.ai",
  "https://myamu-api.wanpanel.ai",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5176",
]);

for (const origin of env.corsOrigins ?? []) {
  requiredCorsOrigins.add(origin);
}

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin || requiredCorsOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
/** Same options as `app.use(cors)` so preflight gets Allow-Credentials + explicit origin (not `*`). */
app.options("*", cors(corsOptions));
app.use(cookieParser());
if (isWorkersRuntime) {
  app.use(workersDbMiddleware);
  app.use(workersJsonBodyParser);
} else {
  app.use(express.json());
}
app.use("/api", apiRouter);
