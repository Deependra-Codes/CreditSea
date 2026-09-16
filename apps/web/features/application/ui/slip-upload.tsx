"use client";

import { Button } from "@/components/button";
import { ApiClientError, api } from "@/lib/api";
import type { SalarySlipResponse } from "@lms/contracts";
import { FileText, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ".pdf,.jpg,.jpeg,.png";

const readableSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function SlipUpload({ onUploaded }: { onUploaded: (slip: SalarySlipResponse) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The cleanup covers both cases: picking another file, and leaving the step.
  // An object URL that is never revoked holds the whole file in memory.
  useEffect(() => {
    if (!file?.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function upload() {
    if (!file) return;
    setPending(true);
    setError(null);

    const body = new FormData();
    body.append("file", file);

    try {
      const result = await api<{ salarySlip: SalarySlipResponse }>("/api/application/salary-slip", {
        method: "POST",
        body,
      });
      toast.success("Salary slip uploaded", { description: result.salarySlip.originalName });
      onUploaded(result.salarySlip);
    } catch (caught) {
      // The client's accept and size check are conveniences; the server checks
      // magic bytes, so its rejection is shown verbatim rather than softened.
      setError(caught instanceof ApiClientError ? caught.message : "Could not reach the server.");
    } finally {
      // Not left to the step change to unmount this: if it ever does not
      // advance, the button would sit on "Uploading…" for good.
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Outside the branch below, so the "choose a different file" label can
          still reach it once a file is staged. */}
      <input
        id="slip"
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(event) => {
          const picked = event.target.files?.[0] ?? null;
          const tooBig = picked !== null && picked.size > MAX_BYTES;
          setError(tooBig ? `That file is ${readableSize(picked.size)}. The limit is 5 MB.` : null);
          setFile(tooBig ? null : picked);
        }}
      />

      {file ? (
        // Seeing the slip is the confirmation. A filename on its own does not
        // tell you that you picked the right page of the right document.
        <div className="enter flex items-center gap-4 rounded-card bg-canvas p-4 ring-1 ring-line">
          {preview ? (
            <img
              src={preview}
              alt={`Preview of ${file.name}`}
              className="size-20 shrink-0 rounded-ctrl object-cover ring-1 ring-line"
            />
          ) : (
            <span className="grid size-20 shrink-0 place-items-center rounded-ctrl bg-surface text-ink-3 ring-1 ring-line">
              <FileText className="size-7" aria-hidden />
            </span>
          )}

          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-mono text-sm text-ink">{file.name}</span>
            <span className="text-xs text-ink-3">{readableSize(file.size)} · ready to upload</span>
            <label
              htmlFor="slip"
              className="mt-1.5 w-fit cursor-pointer text-xs font-bold text-accent underline-offset-4 hover:underline"
            >
              Choose a different file
            </label>
          </div>
        </div>
      ) : (
        <label
          htmlFor="slip"
          className="flex cursor-pointer flex-col items-center gap-2.5 rounded-card bg-canvas px-6 py-12 text-center ring-1 ring-dashed ring-line transition-colors hover:ring-accent"
        >
          <span className="grid size-11 place-items-center rounded-full bg-accent-sub text-accent">
            <UploadCloud className="size-5" aria-hidden />
          </span>
          <span className="text-sm font-bold text-ink">Choose your salary slip</span>
          <span className="text-xs text-ink-3">PDF, JPG or PNG · up to 5 MB</span>
        </label>
      )}

      {error && (
        <p role="alert" className="rounded-ctrl bg-critical/10 px-3 py-2 text-sm text-critical">
          {error}
        </p>
      )}

      <Button
        type="button"
        disabled={!file || pending}
        onClick={() => void upload()}
        className="self-start"
      >
        {pending ? "Uploading…" : "Upload and continue"}
      </Button>
    </div>
  );
}
