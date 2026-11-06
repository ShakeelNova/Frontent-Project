import { Providers } from "./providers";
import { THEME_INIT_SCRIPT } from "@/components/theme/theme";
import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Fluxeaze — Education Operations OS",
    template: "%s · Fluxeaze",
  },
  description:
    "Fluxeaze helps schools, colleges, academies, coaching centres and technical institutes manage less and accomplish more.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-bg font-sans text-text antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        {process.env.NEXT_PUBLIC_API_TRANSPORT === "mock" ? (
          <div
            role="note"
            className="bg-warning-surface px-4 py-2 text-center text-caption font-medium text-warning"
          >
            Dev mock API active — data and sign-in are simulated locally for
            development. Nothing here is a real backend.
          </div>
        ) : null}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
