import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	ArchiveIcon,
	BellOffIcon,
	CalendarIcon,
	MailIcon,
	Share2Icon,
	ShieldIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface NewsletterGridItem {
	key: "frequency" | "content" | "past" | "privacy" | "unsubscribe" | "social";
	icon: ComponentType<{ className?: string }>;
}

const items: NewsletterGridItem[] = [
	{ key: "frequency", icon: CalendarIcon },
	{ key: "content", icon: MailIcon },
	{ key: "past", icon: ArchiveIcon },
	{ key: "privacy", icon: ShieldIcon },
	{ key: "unsubscribe", icon: BellOffIcon },
	{ key: "social", icon: Share2Icon },
];

const spanMap: Record<NewsletterGridItem["key"], string> = {
	frequency: "md:col-span-2",
	content: "md:col-span-1",
	past: "md:col-span-1",
	privacy: "md:col-span-1",
	unsubscribe: "md:col-span-1",
	social: "md:col-span-2",
};

export function NewsletterGrid() {
	const t = useTranslations("newsletter");

	return (
		<section className="section-padding border-b border-border/60">
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
