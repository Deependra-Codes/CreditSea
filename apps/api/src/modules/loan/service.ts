import type { CreateLoanInput } from "@lms/contracts";
import { type LoanViewer, type Paise, type Role, canViewLoan, quoteLoan } from "@lms/domain";
import { HttpError } from "../../lib/http-error";
import { BorrowerProfile } from "../../models/borrower-profile";
import { Loan } from "../../models/loan";
import { Payment } from "../../models/payment";

export async function createLoan(userId: string, input: CreateLoanInput) {
  const profile = await BorrowerProfile.findOne({ userId });
  if (!profile) {
    throw new HttpError(409, "PROFILE_REQUIRED", "Complete your personal details first.");
  }
  if (!profile.bre?.passed) {
    throw new HttpError(409, "NOT_ELIGIBLE", "Your details did not pass the eligibility check.");
  }
  if (!profile.salarySlip) {
    throw new HttpError(409, "SALARY_SLIP_REQUIRED", "Upload your salary slip first.");
  }

  const quote = quoteLoan(input.amount as Paise, input.tenureDays);

  try {
    return await Loan.create({
      borrowerId: userId,
      activeBorrowerId: userId,
      snapshot: {
        fullName: profile.fullName,
        pan: profile.pan,
        dateOfBirth: profile.dateOfBirth,
        monthlySalaryPaise: profile.monthlySalaryPaise,
        employmentMode: profile.employmentMode,
      },
      ...quote,
      outstandingPaise: quote.totalRepayablePaise,
      status: "APPLIED",
      appliedAt: new Date(),
    });
  } catch (err) {
    // The partial unique index on activeBorrowerId is what enforces one active
    // loan; translate its duplicate-key error into something readable.
    if ((err as { code?: number }).code === 11000) {
      throw new HttpError(409, "ACTIVE_LOAN_EXISTS", "You already have a loan in progress.");
    }
    throw err;
  }
}

export const listBorrowerLoans = (userId: string) =>
  Loan.find({ borrowerId: userId }).sort({ appliedAt: -1 });

export async function getLoanForViewer(viewer: LoanViewer, loanId: string) {
  const loan = await Loan.findById(loanId);
  if (!loan) throw HttpError.notFound("Loan");

  const actedRoles = loan.statusHistory.map((event) => event.byRole as Role);
  const view = { borrowerId: String(loan.borrowerId), status: loan.status, actedRoles };
  if (!canViewLoan(viewer, view)) throw HttpError.forbidden();

  const payments = await Payment.find({ loanId: loan._id }).sort({ paidAt: -1 });
  return { loan, payments };
}
