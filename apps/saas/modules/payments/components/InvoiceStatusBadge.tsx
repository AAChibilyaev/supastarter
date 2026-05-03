"use client";

import type { BadgeProps } from "@repo/ui/components/badge";
import { Badge } from "@repo/ui/components/badge";
import { useTranslations } from "next-intl";

export function InvoiceStatusBadge({ status }: { status: string }) {
	const t = useTranslations();

	const badgeLabels: Record<string, string> = {
		paid: t("settings.billing.invoiceHistory.status.paid"),
		open: t("settings.billing.invoiceHistory.status.open"),
		uncollectible: t("settings.billing.invoiceHistory.status.uncollectible"),
		void: t("settings.billing.invoiceHistory.status.void"),
		draft: t("settings.billing.invoiceHistory.status.draft"),
	};

	const badgeColors: Record<string, BadgeProps["status"]> = {
		paid: "success",
		open: "warning",
		uncollectible: "error",
		void: "error",
		draft: "info",
	};

	return <Badge status={badgeColors[status] ?? "info"}>{badgeLabels[status] ?? status}</Badge>;
}
