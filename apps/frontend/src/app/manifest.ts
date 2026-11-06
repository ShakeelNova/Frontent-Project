import type { MetadataRoute } from "next";

/** Web app manifest (installability / PWA-lite metadata). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fluxeaze — Education Operations OS",
    short_name: "Fluxeaze",
    description:
      "Attendance, students, staff, fees and dashboards for every branch in one calm workspace.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#1d4ed8",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
