import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	CodeXmlIcon,
	ContainerIcon,
	GitBranchIcon,
	HardDriveIcon,
	HeadphonesIcon,
	RocketIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface SelfHostItem {
	key: "openSource" | "dockerCompose" | "helmChart" | "coolify" | "noFork" | "support";
	icon: ComponentType<{ className?: string }>;
}

const items: SelfHostItem[] = [
	{ key: "openSource", icon: CodeXmlIcon },
	{ key: "dockerCompose", icon: ContainerIcon },
	{ key: "helmChart", icon: HardDriveIcon },
	{ key: "coolify", icon: RocketIcon },
	{ key: "noFork", icon: GitBranchIcon },
	{ key: "support", icon: HeadphonesIcon },
];

const spanMap: Record<SelfHostItem["key"], string> = {
	openSource: "md:col-span-2",
	dockerCompose: "md:col-span-1",
	helmChart: "md:col-span-1",
	coolify: "md:col-span-1",
	noFork: "md:col-span-1",
	support: "md:col-span-2",
};

export function SelfHostGrid() {
	const t = useTranslations("featuresSelfHost");

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
