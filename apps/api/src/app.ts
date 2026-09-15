import { ok } from "@lms/contracts";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import { env } from "./lib/env";
import { errorHandler, notFound } from "./middleware/error";

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json(ok({ status: "up" }));
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
