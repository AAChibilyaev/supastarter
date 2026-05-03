"use client";

import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";

/**
 * Trial banner displayed on the dashboard for organizations on a free trial.
 * Shows days remaining and a link to upgrade.
 */
export function TrialBanner({
	organizationId,
	orgSlug,
}: {
	organizationId: string;
	orgSlug?: string;
}) {
	const t = useTranslations("settings.billing");

	const { data: trialInfo } = useQuery({
		...orpc.organizations.getTrialInfo.queryOptions({
			input: {
				organizationId,
			},
		}),
		enabled: Boolean(organizationId),
	});

	if (!trialInfo?.isTrialing) return null;

	const billingUrl = orgSlug ? `/organizations/${orgSlug}/settings/billing` : "/settings/billing";

	return (
		<Alert className="mb-6 border-border bg-muted">
			<AlertTitle className="text-muted-foreground">
				{t("trialBannerTitle")}
			</AlertTitle>
			<AlertDescription className="text-muted-foreground">
				<span>{t("trialBannerMessage", { days: trialInfo.daysRemaining })}</span>
				<Button variant="primary" size="sm" className="ml-3" asChild>
					<Link href={billingUrl}>{t("trialBannerUpgrade")}</Link>
				</Button>
			</AlertDescription>
		</Alert>
	);
}
