"use client";

import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { ShieldX } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface ScimEmptyStateProps {
	organizationId: string;
}

export function ScimEmptyState({ organizationId: _organizationId }: ScimEmptyStateProps) {
	const t = useTranslations("settings");

	return (
		<Card className="p-12 flex flex-col items-center justify-center text-center">
			<ShieldX className="mb-4 size-14 text-muted-foreground/40" />
			<h3 className="mb-1 text-lg font-semibold">{t("scim.emptyState.title")}</h3>
			<p className="mb-6 max-w-md text-sm text-muted-foreground">
				{t("scim.emptyState.description")}
			</p>
			<div className="gap-3 flex flex-col items-center">
				<Button asChild variant="primary">
					<Link href="scim/connect">{t("scim.emptyState.cta")}</Link>
				</Button>
				<p className="text-xs text-muted-foreground/60">
					{t("scim.emptyState.planUpgrade")}
				</p>
			</div>
		</Card>
	);
}
