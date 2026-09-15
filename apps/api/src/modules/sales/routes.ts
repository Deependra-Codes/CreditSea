import { MODULE_ROLES } from "@lms/domain";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { readLeads } from "./controller";

export const salesRoutes = Router();

salesRoutes.use(authenticate, authorize(...MODULE_ROLES.sales));
salesRoutes.get("/leads", readLeads);
