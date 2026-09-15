import { MODULE_ROLES } from "@lms/domain";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { readQueue, release } from "./controller";

export const disbursementRoutes = Router();

disbursementRoutes.use(authenticate, authorize(...MODULE_ROLES.disbursement));
disbursementRoutes.get("/queue", readQueue);
disbursementRoutes.post("/:id/release", release);
