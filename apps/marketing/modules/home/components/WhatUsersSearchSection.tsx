import { Card, CardContent } from "@repo/ui/components/card";
import {
	ForwardIcon,
	MessageSquareTextIcon,
	SearchIcon,
	SearchXIcon,
	FilterIcon,
	PenIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface WhatUsersSearchItem {
	key: "entity" | "fuzzy" | "category" | "answer" | "autocomplete" | "noResults";
	icon: ComponentType<{ className?: string }>;
}

const items: WhatUsersSearchItem[] = [
	{ key: "entity", icon: SearchIcon },
	{ key: "fuzzy", icon: PenIcon },
	{ key: "category", icon: FilterIcon },
	{ key: "answer", icon: MessageSquareTextIcon },
	{ key: "autocomplete", icon: ForwardIcon },
	{ key: "noResults", icon: SearchXIcon },
];

export function WhatUsersSearchSection() {
	const t = useTranslations();

	return (
		<section className="section-padding border-b border-border bg-muted/30">
			<div className="container">
				<div className="max-w-3xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						{t("homeWhatUsersSearch.title")}
					</h2>
					<p className="mt-4 text-lg font-light text-balance text-muted-foreground">
						{t("homeWhatUsersSearch.subtitle")}
					</p>
				</div>

				<div className="mt-12 md:mt-16 sm:grid-cols-2 lg:grid-cols-3 gap-4 grid grid-cols-1">
					{items.map(({ key, icon: Icon }) => (
						<Card key={key}>
							<CardContent className="p-6 md:p-8 gap-4 flex flex-col">
								<div className="gap-4 flex items-center">
									<div className="size-10 flex shrink-0 items-center justify-center rounded-lg bg-muted">
										<Icon className="size-5 text-muted-foreground" />
									</div>
									<h3 className="text-lg font-light">
										{t(`homeWhatUsersSearch.items.${key}.title`)}
									</h3>
								</div>
								<p className="text-sm font-light leading-relaxed text-pretty text-muted-foreground">
									{t(`homeWhatUsersSearch.items.${key}.description`)}
								</p>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
