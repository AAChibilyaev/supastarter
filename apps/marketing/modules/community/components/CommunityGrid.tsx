import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	CodeIcon,
	GitPullRequestIcon,
	MapIcon,
	MessageCircleIcon,
	MessageSquareIcon,
	StarIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface CommunityGridItem {
	key: "github" | "discord" | "forum" | "showcase" | "contribute" | "roadmap";
	icon: ComponentType<{ className?: string }>;
}

const items: CommunityGridItem[] = [
	{ key: "github", icon: CodeIcon },
	{ key: "discord", icon: MessageSquareIcon },
	{ key: "forum", icon: MessageCircleIcon },
	{ key: "showcase", icon: StarIcon },
	{ key: "contribute", icon: GitPullRequestIcon },
	{ key: "roadmap", icon: MapIcon },
];

const spanMap: Record<CommunityGridItem["key"], string> = {
	github: "md:col-span-2",
	discord: "md:col-span-1",
	forum: "md:col-span-1",
	showcase: "md:col-span-1",
	contribute: "md:col-span-1",
	roadmap: "md:col-span-2",
};

export function CommunityGrid() {
	const t = useTranslations("community");

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
