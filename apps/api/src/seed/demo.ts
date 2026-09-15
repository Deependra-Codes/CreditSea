import { evaluateBre, quoteLoan, rupeesToPaise } from "@lms/domain";
import { withTransaction } from "../lib/transaction";
import { BorrowerProfile } from "../models/borrower-profile";
import { Loan } from "../models/loan";
import { Payment } from "../models/payment";
import { User } from "../models/user";
import { hashPassword } from "../modules/auth/service";
import { type Actor, transitionLoan } from "../workflows/transition.service";
import { SEED_PASSWORD } from "./accounts";
import { DEMO_BORROWERS, type DemoBorrower } from "./demo-borrowers";

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);
const bornYearsAgo = (years: number) => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date;
};

async function actorFor(email: string): Promise<Actor> {
  const user = await User.findOne({ email });
  if (!user) throw new Error(`Seed expects ${email} to exist. Run account seeding first.`);
  return { id: String(user._id), role: user.role };
}

/**
 * Wipes the demo cohort so re-running resets it, without touching real signups.
 *
 * borrower@lms.test is included deliberately: its whole purpose is to start the
 * four-step wizard from nothing, so seeding must leave it empty.
 */
async function resetCohort() {
  const emails = [...DEMO_BORROWERS.map((borrower) => borrower.email), "borrower@lms.test"];
  const users = await User.find({ email: { $in: emails } }, { _id: 1 });
  const ids = users.map((user) => user._id);

  const loans = await Loan.find({ borrowerId: { $in: ids } }, { _id: 1 });
  await Payment.deleteMany({ loanId: { $in: loans.map((loan) => loan._id) } });
  await Loan.deleteMany({ borrowerId: { $in: ids } });
  await BorrowerProfile.deleteMany({ userId: { $in: ids } });
}

async function createBorrower(borrower: DemoBorrower, passwordHash: string) {
  await User.updateOne(
    { email: borrower.email },
    {
      $set: { fullName: borrower.fullName, email: borrower.email, passwordHash, role: "BORROWER" },
    },
    { upsert: true },
  );
  const user = await User.findOne({ email: borrower.email });
  if (!user) throw new Error(`Failed to create ${borrower.email}`);
  return String(user._id);
}

async function createProfile(borrower: DemoBorrower, userId: string) {
  const dateOfBirth = bornYearsAgo(borrower.bornYearsAgo);
  const monthlySalaryPaise = rupeesToPaise(borrower.monthlySalary);

  const bre = evaluateBre({
    pan: borrower.pan,
    dateOfBirth,
    monthlySalaryPaise,
    employmentMode: borrower.employmentMode,
  });

  await BorrowerProfile.create({
    userId,
    fullName: borrower.fullName,
    pan: borrower.pan,
    dateOfBirth,
    monthlySalaryPaise,
    employmentMode: borrower.employmentMode,
    bre: { ...bre, evaluatedAt: daysAgo(6) },
    // A placeholder record: the file itself is uploaded through the portal.
    salarySlip: bre.passed
      ? {
          storedName: "seed-placeholder.pdf",
          originalName: "salary-slip.pdf",
          mimeType: "application/pdf",
          sizeBytes: 48_120,
          uploadedAt: daysAgo(5),
        }
      : null,
  });

  return bre.passed;
}

async function createLoan(borrower: DemoBorrower, userId: string, appliedDaysAgo: number) {
  const quote = quoteLoan(rupeesToPaise(borrower.amount ?? 50_000), borrower.tenureDays ?? 30);

  return Loan.create({
    borrowerId: userId,
    activeBorrowerId: userId,
    snapshot: {
      fullName: borrower.fullName,
      pan: borrower.pan,
      dateOfBirth: bornYearsAgo(borrower.bornYearsAgo),
      monthlySalaryPaise: rupeesToPaise(borrower.monthlySalary),
      employmentMode: borrower.employmentMode,
    },
    ...quote,
    outstandingPaise: quote.totalRepayablePaise,
    status: "APPLIED",
    appliedAt: daysAgo(appliedDaysAgo),
  });
}

/**
 * Every status change goes through transitionLoan, exactly as the dashboard
 * does. Writing statuses directly here would be faster and would quietly break
 * the invariant the whole design rests on.
 */
async function advance(borrower: DemoBorrower, loanId: string, actors: Record<string, Actor>) {
  const { sanction, disbursement, collection } = actors as {
    sanction: Actor;
    disbursement: Actor;
    collection: Actor;
  };

  if (borrower.outcome === "REJECTED") {
    await withTransaction((session) =>
      transitionLoan({
        loanId,
        to: "REJECTED",
        actor: sanction,
        reason: borrower.rejectionReason ?? "Did not meet policy.",
        session,
      }),
    );
    return;
  }

  if (borrower.outcome === "APPLIED") return;

  await withTransaction((session) =>
    transitionLoan({ loanId, to: "SANCTIONED", actor: sanction, session }),
  );
  if (borrower.outcome === "SANCTIONED") return;

  await withTransaction((session) =>
    transitionLoan({ loanId, to: "DISBURSED", actor: disbursement, session }),
  );
  if (borrower.outcome === "DISBURSED") return;

  const loan = await Loan.findById(loanId);
  if (!loan) return;

  if (borrower.outcome === "PART_PAID") {
    const part = Math.round(loan.totalRepayablePaise * 0.35);
    await Payment.create({
      loanId,
      utr: `SEEDPART${loan._id.toString().slice(-6).toUpperCase()}`,
      amountPaise: part,
      paidAt: daysAgo(2),
      recordedBy: collection.id,
    });
    await Loan.updateOne({ _id: loanId }, { $inc: { outstandingPaise: -part } });
    return;
  }

  if (borrower.outcome === "CLOSED") {
    await Payment.create({
      loanId,
      utr: `SEEDFULL${loan._id.toString().slice(-6).toUpperCase()}`,
      amountPaise: loan.totalRepayablePaise,
      paidAt: daysAgo(1),
      recordedBy: collection.id,
    });
    await Loan.updateOne({ _id: loanId }, { $set: { outstandingPaise: 0 } });
    await withTransaction((session) =>
      transitionLoan({ loanId, to: "CLOSED", actor: collection, session }),
    );
  }
}

export async function seedDemoData() {
  await resetCohort();

  const passwordHash = await hashPassword(SEED_PASSWORD);
  const actors = {
    sanction: await actorFor("sanction@lms.test"),
    disbursement: await actorFor("disbursement@lms.test"),
    collection: await actorFor("collection@lms.test"),
  };

  let appliedDaysAgo = 9;

  for (const borrower of DEMO_BORROWERS) {
    const userId = await createBorrower(borrower, passwordHash);

    if (borrower.outcome === "LEAD_ONLY") {
      console.log(`  ${borrower.fullName.padEnd(18)} lead only`);
      continue;
    }

    const eligible = await createProfile(borrower, userId);
    if (!eligible || borrower.outcome === "NOT_ELIGIBLE" || borrower.outcome === "READY") {
      console.log(
        `  ${borrower.fullName.padEnd(18)} ${eligible ? "ready to apply" : "not eligible"}`,
      );
      continue;
    }

    const loan = await createLoan(borrower, userId, appliedDaysAgo);
    appliedDaysAgo = Math.max(1, appliedDaysAgo - 1);

    await advance(borrower, String(loan._id), actors);
    console.log(
      `  ${borrower.fullName.padEnd(18)} ${borrower.outcome.toLowerCase().replace("_", " ")}`,
    );
  }
}
