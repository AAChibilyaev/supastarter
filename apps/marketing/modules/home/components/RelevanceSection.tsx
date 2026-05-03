import { Card, CardContent } from "@repo/ui/components/card";
import {
	ArrowUpDownIcon,
	BookTextIcon,
	PinIcon,
	UserIcon,
	FlaskConicalIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface RelevanceItem {
	key: "ranking" | "synonyms" | "curations" | "personalization" | "abTesting";
	icon: ComponentType<{ className?: string }>;
}

const items: RelevanceItem[] = [
	{ key: "ranking", icon: ArrowUpDownIcon },
	{ key: "synonyms", icon: BookTextIcon },
	{ key: "curations", icon: PinIcon },
	{ key: "personalization", icon: UserIcon },
	{ key: "abTesting", icon: FlaskConicalIcon },
];

export function RelevanceSection() {
	const t = useTranslations();

	return (
		<section className="section-padding border-b border-border bg-muted/30">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						{t("homeRelevance.title")}
					</h2>
					<p className="mt-4 text-lg font-light text-balance text-muted-foreground">
						{t("homeRelevance.subtitle")}
					</p>
				</div>

				<div className="mt-12 md:mt-16 sm:grid-cols-2 lg:grid-cols-3 gap-4 grid grid-cols-1">
					{items.map(({ key, icon: Icon }) => (
						<Card key={key}>
							<CardContent className="p-6 md:p-8 gap-4 flex flex-col">
								<div className="size-10 flex shrink-0 items-center justify-center rounded-lg bg-muted">
									<Icon className="size-5 text-muted-foreground" />
								</div>
								<div>
									<h3 className="text-lg font-normal">
										{t(`homeRelevance.${key}.title`)}
									</h3>
									<p className="mt-2 text-sm font-light leading-relaxed text-pretty text-muted-foreground">
										{t(`homeRelevance.${key}.description`)}
									</p>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
