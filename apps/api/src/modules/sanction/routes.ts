import { sanctionSchema } from "@lms/contracts";
import { MODULE_ROLES } from "@lms/domain";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { decide, readQueue } from "./controller";

export const sanctionRoutes = Router();

sanctionRoutes.use(authenticate, authorize(...MODULE_ROLES.sanction));
sanctionRoutes.get("/queue", readQueue);
sanctionRoutes.post("/:id/decide", validate(sanctionSchema), decide);
