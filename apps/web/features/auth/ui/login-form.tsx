"use client";

import { Button } from "@/components/button";
import { Field, inputClass } from "@/components/field";
import { useState } from "react";
import { useAuthSubmit } from "../model/use-auth-submit";
import { FormError } from "./auth-shell";
import { DemoAccounts } from "./demo-accounts";

export function LoginForm() {
  const { submit, pending, formError, fieldErrors } = useAuthSubmit("/api/auth/login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit({ email, password });
      }}
    >
      <FormError message={formError} />

      <Field label="Email" htmlFor="login-email" error={fieldErrors.email}>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>

      <Field label="Password" htmlFor="login-password" error={fieldErrors.password}>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>

      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <DemoAccounts
        onPick={(demoEmail, demoPassword) => {
          setEmail(demoEmail);
          setPassword(demoPassword);
        }}
      />
    </form>
  );
}
