import "@fontsource-variable/inter";
import { Providers } from "./providers";
import { THEME_INIT_SCRIPT } from "@/components/theme/theme";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Fluxeaze — Education Operations OS",
    template: "%s · Fluxeaze",
  },
  description:
    "Fluxeaze helps schools, colleges, academies, coaching centres and technical institutes manage less and accomplish more.",
  applicationName: "Fluxeaze",
  keywords: [
    "school management",
    "education operations",
    "attendance software",
    "student information system",
    "fee management",
    "multi-branch school software",
  ],
  authors: [{ name: "Fluxeaze" }],
  openGraph: {
    type: "website",
    siteName: "Fluxeaze",
    title: "Fluxeaze — Education Operations OS",
    description:
      "Attendance, students, staff, fees and dashboards for every branch in one calm workspace.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fluxeaze — Education Operations OS",
    description:
      "Attendance, students, staff, fees and dashboards for every branch in one calm workspace.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
