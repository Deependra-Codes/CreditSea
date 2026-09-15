"use client";

import { Button } from "@/components/button";
import { Field, inputClass } from "@/components/field";
import { useState } from "react";
import { useAuthSubmit } from "../model/use-auth-submit";
import { FormError } from "./auth-shell";

export function RegisterForm() {
  const { submit, pending, formError, fieldErrors } = useAuthSubmit("/api/auth/register");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit({ fullName, email, password });
      }}
    >
      <FormError message={formError} />

      <Field label="Full name" htmlFor="register-name" error={fieldErrors.fullName}>
        <input
          id="register-name"
          name="fullName"
          autoComplete="name"
          required
          className={inputClass}
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
      </Field>

      <Field label="Email" htmlFor="register-email" error={fieldErrors.email}>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="register-password"
        hint="At least 8 characters."
        error={fieldErrors.password}
      >
        <input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>

      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
