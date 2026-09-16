import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { ThemeScript } from "./theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marg Lending",
  description: "One path, four stops. Apply for a loan and track it through to closure.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <ThemeScript />
        {children}
        {/* Under the header, where the work is. At bottom-right it landed in the
            empty corner of a wide screen and confirmations went unseen. */}
        <Toaster
          position="top-center"
          offset="88px"
          toastOptions={{
            style: {
              background: "var(--color-canvas)",
              color: "var(--color-ink)",
              border: "1px solid var(--color-line)",
              fontFamily: "var(--font-sans)",
            },
          }}
        />
      </body>
    </html>
  );
}
