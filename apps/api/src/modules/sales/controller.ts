import { ok } from "@lms/contracts";
import type { Request, Response } from "express";
import { listLeads } from "./service";

export async function readLeads(_req: Request, res: Response) {
  res.json(ok({ leads: await listLeads() }));
}
