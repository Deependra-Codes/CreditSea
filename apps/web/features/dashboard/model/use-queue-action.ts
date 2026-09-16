"use client";

import { ApiClientError, toFieldErrors } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * A queue action is a mutation whose result the page then has to re-read, so the
 * control stays busy until BOTH halves finish — the request, and the refresh
 * that brings the new rows back.
 *
 * Tracking only the request is what killed the collection button: a part payment
 * leaves the loan in the queue, so that row never unmounted and nothing was left
 * to clear the flag. The other two modules only looked correct because their row
 * always left the queue.
 */
export function useQueueAction() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function run(action: () => Promise<void>) {
    // Guarded here rather than trusting every caller to disable its control: a
    // form still submits on Enter, and a second write is not a cosmetic problem.
    if (running || refreshing) return;
    setRunning(true);
    setError(null);
    setFieldErrors({});

    try {
      await action();
      startRefresh(() => router.refresh());
    } catch (caught) {
      if (caught instanceof ApiClientError) {
        setError(caught.message);
        if (caught.code === "VALIDATION_FAILED") setFieldErrors(toFieldErrors(caught.details));
      } else {
        setError("Could not reach the server.");
      }
    } finally {
      setRunning(false);
    }
  }

  return { run, busy: running || refreshing, error, fieldErrors };
}
