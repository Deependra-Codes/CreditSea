"use client";

import { ApiClientError, api, toFieldErrors } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Shared truth, not shared shape: login and register post different bodies to
 * different routes, but the submit lifecycle — pending, envelope errors, field
 * errors, redirect — is one thing. Each form keeps its own markup.
 */
export function useAuthSubmit(path: string) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(body: Record<string, string>) {
    setPending(true);
    setFormError(null);
    setFieldErrors({});

    try {
      await api(path, { method: "POST", body: JSON.stringify(body) });
      // Middleware reads the fresh cookie and routes by role.
      router.replace("/");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setFormError(error.message);
        if (error.code === "VALIDATION_FAILED") setFieldErrors(toFieldErrors(error.details));
      } else {
        setFormError("Could not reach the server. Check that the API is running on port 4000.");
      }
      setPending(false);
    }
  }

  return { submit, pending, formError, fieldErrors };
}
