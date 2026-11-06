import {
  QUOTE_STATUS_LABELS,
  VERSION_STATUS_LABELS,
  type QuoteStatus,
  type VersionStatus,
  type WarningLevel,
} from "@/api/services/admin-catalog";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

const VERSION_VARIANT: Record<VersionStatus, BadgeVariant> = {
  draft: "default",
  preview: "info",
  approved: "warning",
  published: "success",
  retired: "error",
};

export function VersionStatusBadge({ status }: { status: VersionStatus }) {
  return <Badge variant={VERSION_VARIANT[status]}>{VERSION_STATUS_LABELS[status]}</Badge>;
}

const QUOTE_VARIANT: Record<QuoteStatus, BadgeVariant> = {
  draft: "default",
  sent: "info",
  accepted: "warning",
  rejected: "error",
  converted: "success",
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <Badge variant={QUOTE_VARIANT[status]}>{QUOTE_STATUS_LABELS[status]}</Badge>;
}

const WARNING_VARIANT: Record<WarningLevel, BadgeVariant> = {
  ok: "success",
  warning: "warning",
  critical: "error",
};

const WARNING_LABEL: Record<WarningLevel, string> = {
  ok: "Healthy",
  warning: "At risk",
  critical: "Critical",
};

export function WarningBadge({ level }: { level: WarningLevel }) {
  return <Badge variant={WARNING_VARIANT[level]}>{WARNING_LABEL[level]}</Badge>;
}
