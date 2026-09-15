import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { downloadSalarySlip } from "./controller";

export const fileRoutes = Router();

fileRoutes.use(authenticate);
fileRoutes.get("/salary-slip/:userId", downloadSalarySlip);
