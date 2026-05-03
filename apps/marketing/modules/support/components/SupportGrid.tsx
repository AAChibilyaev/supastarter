import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	BookOpenIcon,
	MailIcon,
	MessageCircleIcon,
	MessageSquareIcon,
	ShieldCheckIcon,
	UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface SupportGridItem {
	key: "documentation" | "community" | "email" | "chat" | "slack" | "sla";
	icon: ComponentType<{ className?: string }>;
}

const items: SupportGridItem[] = [
	{ key: "documentation", icon: BookOpenIcon },
	{ key: "community", icon: UsersIcon },
	{ key: "email", icon: MailIcon },
	{ key: "chat", icon: MessageCircleIcon },
	{ key: "slack", icon: MessageSquareIcon },
	{ key: "sla", icon: ShieldCheckIcon },
];

const spanMap: Record<SupportGridItem["key"], string> = {
	documentation: "md:col-span-2",
	community: "md:col-span-1",
	email: "md:col-span-1",
	chat: "md:col-span-1",
	slack: "md:col-span-1",
	sla: "md:col-span-2",
};

export function SupportGrid() {
	const t = useTranslations("support");

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
