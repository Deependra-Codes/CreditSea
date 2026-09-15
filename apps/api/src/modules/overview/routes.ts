import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { readOverview } from "./controller";

export const overviewRoutes = Router();

// Admin only: the whole book is aggregate, but it spans every module, and an
// executive's remit stops at their own stage.
overviewRoutes.use(authenticate, authorize("ADMIN"));
overviewRoutes.get("/", readOverview);
