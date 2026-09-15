"use client";

import { Button } from "@/components/button";
import { ApiClientError, api } from "@/lib/api";
import type { SalarySlipResponse } from "@lms/contracts";
import { useRef, useState } from "react";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ".pdf,.jpg,.jpeg,.png";

const readableSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function SlipUpload({ onUploaded }: { onUploaded: (slip: SalarySlipResponse) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      onUploaded(result.salarySlip);
    } catch (caught) {
      // The client's accept and size check are conveniences; the server checks
      // magic bytes, so its rejection is shown verbatim rather than softened.
      setError(caught instanceof ApiClientError ? caught.message : "Could not reach the server.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <label
        htmlFor="slip"
        className="flex cursor-pointer flex-col items-center gap-2 rounded-card border border-dashed border-line-2 bg-canvas px-6 py-10 text-center hover:border-accent"
      >
        <span className="text-sm font-semibold text-ink">Choose your salary slip</span>
        <span className="text-xs text-ink-3">PDF, JPG or PNG · up to 5 MB</span>
        <input
          ref={inputRef}
          id="slip"
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(event) => {
            const picked = event.target.files?.[0] ?? null;
            setError(
              picked && picked.size > MAX_BYTES
                ? `That file is ${readableSize(picked.size)}. The limit is 5 MB.`
                : null,
            );
            setFile(picked && picked.size <= MAX_BYTES ? picked : null);
          }}
        />
      </label>

      {file && (
        <p className="text-sm text-ink-2">
          <span className="font-mono">{file.name}</span>{" "}
          <span className="text-ink-3">({readableSize(file.size)})</span>
        </p>
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
