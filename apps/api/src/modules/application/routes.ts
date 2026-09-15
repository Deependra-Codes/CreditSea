import { profileSchema } from "@lms/contracts";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { uploadSingle } from "../../middleware/upload";
import { validate } from "../../middleware/validate";
import { readApplication, updateProfile, uploadSalarySlip } from "./controller";

export const applicationRoutes = Router();

// Guards on the router, so a new route cannot be added unguarded by accident.
applicationRoutes.use(authenticate, authorize("BORROWER"));

applicationRoutes.get("/me", readApplication);
applicationRoutes.put("/profile", validate(profileSchema), updateProfile);
applicationRoutes.post("/salary-slip", uploadSingle, uploadSalarySlip);
