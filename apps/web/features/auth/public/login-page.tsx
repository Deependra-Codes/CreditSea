import Link from "next/link";
import { AuthShell } from "../ui/auth-shell";
import { LoginForm } from "../ui/login-form";

export function LoginPage() {
  return (
    <AuthShell
      title="Sign in"
      subtitle="Borrowers apply and track their loan. Executives work their module."
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="font-semibold text-accent hover:underline">
            Create a borrower account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
