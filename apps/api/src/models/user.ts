import { ROLES } from "@lms/domain";
import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true, default: "BORROWER" },
  },
  { timestamps: true },
);

export const User = model("User", userSchema);
