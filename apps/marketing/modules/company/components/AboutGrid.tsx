import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	CircuitBoardIcon,
	CodeIcon,
	HeartHandshakeIcon,
	MapIcon,
	TargetIcon,
	UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface AboutItem {
	key: "mission" | "technology" | "openCore" | "team" | "values" | "roadmap";
	icon: ComponentType<{ className?: string }>;
}

const items: AboutItem[] = [
	{ key: "mission", icon: TargetIcon },
	{ key: "technology", icon: CircuitBoardIcon },
	{ key: "openCore", icon: CodeIcon },
	{ key: "team", icon: UsersIcon },
	{ key: "values", icon: HeartHandshakeIcon },
	{ key: "roadmap", icon: MapIcon },
];

const spanMap: Record<AboutItem["key"], string> = {
	mission: "md:col-span-2",
	technology: "md:col-span-1",
	openCore: "md:col-span-1",
	team: "md:col-span-1",
	values: "md:col-span-1",
	roadmap: "md:col-span-2",
};

export function AboutGrid() {
	const t = useTranslations("about");

	return (
		<section className="section-padding border-b border-border/60">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
						{t("title")}
					</h2>
					<p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
				</div>

				<div className="mt-16 gap-4 sm:grid-cols-2 md:grid-cols-4 grid grid-cols-1">
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
