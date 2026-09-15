import { paymentSchema } from "@lms/contracts";
import { MODULE_ROLES } from "@lms/domain";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { addPayment, readPayments, readQueue } from "./controller";

export const collectionRoutes = Router();

collectionRoutes.use(authenticate, authorize(...MODULE_ROLES.collection));
collectionRoutes.get("/queue", readQueue);
collectionRoutes.get("/:id/payments", readPayments);
collectionRoutes.post("/:id/payments", validate(paymentSchema), addPayment);
