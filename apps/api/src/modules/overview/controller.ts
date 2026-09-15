import { type OverviewResponse, ok } from "@lms/contracts";
import type { Request, Response } from "express";
import { buildOverview, recentActivity } from "./service";

export async function readOverview(_req: Request, res: Response) {
  const [summary, activity] = await Promise.all([buildOverview(), recentActivity()]);
  const body: OverviewResponse = { ...summary, activity };
  res.json(ok(body));
}
