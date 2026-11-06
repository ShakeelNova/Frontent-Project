import { DevicesPanel } from "@/components/devices/devices-panel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Devices" };

export default function DevicesPage() {
  return <DevicesPanel />;
}
