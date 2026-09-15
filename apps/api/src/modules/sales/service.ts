import type { LeadResponse } from "@lms/contracts";
import { ACTIVE_LOAN_STATUSES, leadStage } from "@lms/domain";
import { BorrowerProfile } from "../../models/borrower-profile";
import { Loan } from "../../models/loan";
import { User } from "../../models/user";

/**
 * Sales works the pre-application funnel, so this lists borrowers rather than
 * loans. Three reads and an in-memory join: the borrower count in this system
 * makes an aggregation pipeline the more expensive thing to maintain.
 */
export async function listLeads(): Promise<LeadResponse[]> {
  const borrowers = await User.find({ role: "BORROWER" }).sort({ createdAt: -1 });
  const ids = borrowers.map((borrower) => borrower._id);

  const [profiles, loans] = await Promise.all([
    BorrowerProfile.find({ userId: { $in: ids } }),
    Loan.find({ borrowerId: { $in: ids } }, { borrowerId: 1, status: 1 }),
  ]);

  const profileByUser = new Map(profiles.map((profile) => [String(profile.userId), profile]));
  const activeByUser = new Set(
    loans
      .filter((loan) => ACTIVE_LOAN_STATUSES.includes(loan.status))
      .map((loan) => String(loan.borrowerId)),
  );
  const everAppliedByUser = new Set(loans.map((loan) => String(loan.borrowerId)));

  return borrowers.map((borrower) => {
    const id = String(borrower._id);
    const profile = profileByUser.get(id);

    return {
      id,
      fullName: profile?.fullName ?? borrower.fullName,
      email: borrower.email,
      pan: profile?.pan ?? null,
      registeredAt: (borrower as { createdAt?: Date }).createdAt?.toISOString() ?? null,
      stage: leadStage({
        hasProfile: Boolean(profile),
        breEvaluated: Boolean(profile?.bre),
        brePassed: Boolean(profile?.bre?.passed),
        hasLoan: everAppliedByUser.has(id),
      }),
      hasActiveLoan: activeByUser.has(id),
    };
  });
}
