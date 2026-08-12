import express from "express";
import cors from "cors";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export const app = express();

// FRONTEND_URL restricts CORS to the deployed frontend in production; with
// it unset (local dev) all origins are allowed for convenience.
const allowedOrigin = process.env.FRONTEND_URL;
app.use(cors(allowedOrigin ? { origin: allowedOrigin } : undefined));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);
