import { ok } from "@lms/contracts";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import { env } from "./lib/env";
import { errorHandler, notFound } from "./middleware/error";
import { applicationRoutes } from "./modules/application/routes";
import { authRoutes } from "./modules/auth/routes";
import { fileRoutes } from "./modules/files/routes";
import { loanRoutes } from "./modules/loan/routes";

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json(ok({ status: "up" }));
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/application", applicationRoutes);
  app.use("/api/loans", loanRoutes);
  app.use("/api/files", fileRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
