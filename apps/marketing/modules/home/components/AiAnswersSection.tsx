import { Card, CardContent } from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { SparklesIcon, FileSearchIcon, BracesIcon, LayoutListIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ComponentType } from "react";

interface AiItem {
	key: "hybrid" | "citedAnswers" | "rag" | "searchFirst";
	icon: ComponentType<{ className?: string }>;
}

const items: AiItem[] = [
	{ key: "hybrid", icon: SparklesIcon },
	{ key: "citedAnswers", icon: FileSearchIcon },
	{ key: "rag", icon: BracesIcon },
	{ key: "searchFirst", icon: LayoutListIcon },
];

export function AiAnswersSection() {
	const t = useTranslations();

	return (
		<section className="section-padding border-b border-border">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						{t("homeAiAnswers.title")}
					</h2>
					<p className="mt-4 text-lg font-light text-balance text-muted-foreground">
						{t("homeAiAnswers.subtitle")}
					</p>
				</div>

				<div className="mt-12 md:mt-16 sm:grid-cols-2 gap-4 grid grid-cols-1">
					{items.map(({ key, icon: Icon }) => (
						<Card key={key}>
							<CardContent className="p-6 md:p-8 gap-4 flex flex-col">
								<div className="size-10 flex shrink-0 items-center justify-center rounded-lg bg-muted">
									<Icon className="size-5 text-muted-foreground" />
								</div>
								<div>
									<h3 className="text-lg font-light">
										{t(`homeAiAnswers.items.${key}.title`)}
									</h3>
									<p className="mt-2 text-sm font-light leading-relaxed text-pretty text-muted-foreground">
										{t(`homeAiAnswers.items.${key}.description`)}
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
