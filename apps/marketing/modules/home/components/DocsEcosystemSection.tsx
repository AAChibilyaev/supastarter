import { Card, CardContent } from "@repo/ui/components/card";
import {
	Code2Icon,
	GlobeIcon,
	WebhookIcon,
	FrameIcon,
	ArrowLeftRightIcon,
	PlayIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface DocsItem {
	key: "sdk" | "rest" | "webhooks" | "frameworks" | "migration" | "playground";
	icon: ComponentType<{ className?: string }>;
}

const items: DocsItem[] = [
	{ key: "sdk", icon: Code2Icon },
	{ key: "rest", icon: GlobeIcon },
	{ key: "webhooks", icon: WebhookIcon },
	{ key: "frameworks", icon: FrameIcon },
	{ key: "migration", icon: ArrowLeftRightIcon },
	{ key: "playground", icon: PlayIcon },
];

export function DocsEcosystemSection() {
	const t = useTranslations();

	return (
		<section className="section-padding border-b border-border bg-muted/30">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						{t("homeDocsEcosystem.title")}
					</h2>
					<p className="mt-4 text-lg font-light text-balance text-muted-foreground">
						{t("homeDocsEcosystem.subtitle")}
					</p>
				</div>

				<div className="mt-12 md:mt-16 sm:grid-cols-2 lg:grid-cols-3 gap-4 grid grid-cols-1">
					{items.map(({ key, icon: Icon }) => (
						<Card key={key}>
							<CardContent className="p-6 md:p-8 gap-4 flex flex-col">
								<div className="flex items-center gap-4">
									<div className="size-10 flex shrink-0 items-center justify-center rounded-lg bg-muted">
										<Icon className="size-5 text-muted-foreground" />
									</div>
									<h3 className="text-lg font-light">
									{t(`homeDocsEcosystem.items.${key}.title`)}
									</h3>
								</div>
								<p className="text-sm font-light leading-relaxed text-pretty text-muted-foreground">
									{t(`homeDocsEcosystem.items.${key}.description`)}
								</p>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
