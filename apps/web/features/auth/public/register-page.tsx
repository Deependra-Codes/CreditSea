import Link from "next/link";
import { AuthShell } from "../ui/auth-shell";
import { RegisterForm } from "../ui/register-form";

export function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Four steps: your details, an eligibility check, your salary slip, then your loan."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
