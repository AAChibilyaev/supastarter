import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	ActivityIcon,
	ClipboardListIcon,
	GlobeIcon,
	LockIcon,
	RefreshCwIcon,
	ShieldCheckIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface SolutionsHealthcareItem {
	key:
		| "clinicalTerms"
		| "hipaaReady"
		| "auditLog"
		| "tenantIsolation"
		| "realTimeUpdates"
		| "multiLanguage";
	icon: ComponentType<{ className?: string }>;
}

const items: SolutionsHealthcareItem[] = [
	{ key: "clinicalTerms", icon: ActivityIcon },
	{ key: "hipaaReady", icon: ShieldCheckIcon },
	{ key: "auditLog", icon: ClipboardListIcon },
	{ key: "tenantIsolation", icon: LockIcon },
	{ key: "realTimeUpdates", icon: RefreshCwIcon },
	{ key: "multiLanguage", icon: GlobeIcon },
];

const spanMap: Record<SolutionsHealthcareItem["key"], string> = {
	clinicalTerms: "md:col-span-2",
	hipaaReady: "md:col-span-1",
	auditLog: "md:col-span-1",
	tenantIsolation: "md:col-span-1",
	realTimeUpdates: "md:col-span-1",
	multiLanguage: "md:col-span-2",
};

export function SolutionsHealthcareGrid() {
	const t = useTranslations("solutionsHealthcare");

	return (
		<section className="py-24 border-b border-border/60">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
						{t("title")}
					</h2>
					<p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
				</div>

				<div className="mt-16 gap-4 md:grid-cols-4 grid grid-cols-1">
					{items.map(({ key, icon: Icon }) => (
						<Card
							key={key}
							className={cn(
								"group transition-colors hover:border-primary/30 hover:bg-accent/5",
								spanMap[key],
							)}
						>
							<FeatureCardHeaderRow icon={Icon}>
								<CardTitle>{t(`items.${key}.title`)}</CardTitle>
							</FeatureCardHeaderRow>
							<CardContent>
								<CardDescription className="text-sm leading-relaxed">
									{t(`items.${key}.description`)}
								</CardDescription>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
