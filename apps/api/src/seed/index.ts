import { connectDb, disconnectDb } from "../lib/db";
import { env } from "../lib/env";
import { BorrowerProfile } from "../models/borrower-profile";
import { Loan } from "../models/loan";
import { Payment } from "../models/payment";
import { User } from "../models/user";
import { hashPassword } from "../modules/auth/service";
import { SEED_ACCOUNTS, SEED_PASSWORD } from "./accounts";

const MODELS = [User, BorrowerProfile, Loan, Payment];

/**
 * Mongoose only builds indexes once a model is used, so a fresh database would
 * have no unique index on UTR and no partial index enforcing one active loan.
 * Those are correctness guarantees, so seeding creates them up front.
 */
async function syncIndexes() {
  for (const model of MODELS) {
    await model.syncIndexes();
    console.log(`  ${model.modelName.padEnd(16)} indexes ready`);
  }
}

async function seedAccounts() {
  const passwordHash = await hashPassword(SEED_PASSWORD);

  for (const account of SEED_ACCOUNTS) {
    await User.updateOne(
      { email: account.email },
      { $set: { ...account, passwordHash } },
      { upsert: true },
    );
    console.log(`  ${account.role.padEnd(13)} ${account.email}`);
  }
}

/** Idempotent: upserts by email, so re-running never duplicates. */
async function seed() {
  await connectDb(env.MONGODB_URI);

  console.log("\nIndexes");
  await syncIndexes();

  console.log("\nAccounts");
  await seedAccounts();

  console.log(`\n  password for every account: ${SEED_PASSWORD}\n`);
  await disconnectDb();
}

seed().catch(async (err) => {
  console.error("Seed failed:", err);
  await disconnectDb().catch(() => {});
  process.exit(1);
});
