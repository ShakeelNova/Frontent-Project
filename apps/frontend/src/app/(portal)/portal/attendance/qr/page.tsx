import { QrSessionPanel } from "@/components/attendance/qr-session-panel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "QR check-in" };

export default function QrCheckInPage() {
  return <QrSessionPanel />;
}
