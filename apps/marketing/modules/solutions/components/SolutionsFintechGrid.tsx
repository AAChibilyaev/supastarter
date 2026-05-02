import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	ClipboardListIcon,
	FileCheckIcon,
	KeyIcon,
	LockIcon,
	ShieldIcon,
	ZapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface SolutionsFintechItem {
	key: "tenantIsolation" | "auditLog" | "accessControls" | "encryption" | "gdpr" | "performance";
	icon: ComponentType<{ className?: string }>;
}

const items: SolutionsFintechItem[] = [
	{ key: "tenantIsolation", icon: ShieldIcon },
	{ key: "auditLog", icon: ClipboardListIcon },
	{ key: "accessControls", icon: KeyIcon },
	{ key: "encryption", icon: LockIcon },
	{ key: "gdpr", icon: FileCheckIcon },
	{ key: "performance", icon: ZapIcon },
];

const spanMap: Record<SolutionsFintechItem["key"], string> = {
	tenantIsolation: "md:col-span-2",
	auditLog: "md:col-span-1",
	accessControls: "md:col-span-1",
	encryption: "md:col-span-1",
	gdpr: "md:col-span-1",
	performance: "md:col-span-2",
};

export function SolutionsFintechGrid() {
	const t = useTranslations("solutionsFintech");

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
