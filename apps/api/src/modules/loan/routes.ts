import { createLoanSchema } from "@lms/contracts";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { apply, loanDetail, myLoans } from "./controller";

export const loanRoutes = Router();

loanRoutes.use(authenticate);

loanRoutes.post("/", authorize("BORROWER"), validate(createLoanSchema), apply);
// Registered before /:id so the literal path is not captured as an id.
loanRoutes.get("/me", authorize("BORROWER"), myLoans);
// Any signed-in role may ask; canViewLoan decides per loan.
loanRoutes.get("/:id", loanDetail);
