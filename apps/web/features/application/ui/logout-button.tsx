"use client";

import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="text-xs font-medium text-ink-2 hover:text-ink"
      onClick={async () => {
        await api("/api/auth/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
