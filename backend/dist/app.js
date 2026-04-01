import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
export const app = express();
const corsOptions = env.corsOrigins === null
    ? { origin: true }
    : { origin: env.corsOrigins };
app.use(cors(corsOptions));
app.use(express.json());
app.use("/api", apiRouter);
//# sourceMappingURL=app.js.map