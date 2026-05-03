import { Card, CardContent } from "@repo/ui/components/card";
import {
	BriefcaseIcon,
	BookOpenIcon,
	ShoppingCartIcon,
	Building2Icon,
	StoreIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface UseCaseItem {
	key: "saas" | "docs" | "ecommerce" | "internal" | "marketplace";
	icon: ComponentType<{ className?: string }>;
}

const items: UseCaseItem[] = [
	{ key: "saas", icon: BriefcaseIcon },
	{ key: "docs", icon: BookOpenIcon },
	{ key: "ecommerce", icon: ShoppingCartIcon },
	{ key: "internal", icon: Building2Icon },
	{ key: "marketplace", icon: StoreIcon },
];

export function UseCasesGrid() {
	const t = useTranslations();

	return (
		<section className="section-padding border-b border-border">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						{t("homeUseCases.title")}
					</h2>
					<p className="mt-4 text-lg font-light text-balance text-muted-foreground">
						{t("homeUseCases.subtitle")}
					</p>
				</div>

				<div className="mt-12 md:mt-16 gap-4 md:grid-cols-2 lg:grid-cols-3 grid grid-cols-1">
					{items.map(({ key, icon: Icon }) => (
						<Card key={key} className="text-left">
							<CardContent className="p-6 md:p-8 gap-4 flex flex-col">
								<div className="flex items-center gap-4">
									<div className="size-10 flex shrink-0 items-center justify-center rounded-lg bg-muted">
										<Icon className="size-5 text-muted-foreground" />
									</div>
									<h3 className="text-lg font-light">
										{t(`homeUseCases.items.${key}.title`)}
									</h3>
								</div>
								<p className="text-sm font-light leading-relaxed text-pretty text-muted-foreground">
									{t(`homeUseCases.items.${key}.description`)}
								</p>
								<div className="mt-3 gap-1.5 flex flex-wrap">
									{t(`homeUseCases.items.${key}.searchExamples`)
										.split(", ")
										.slice(0, 4)
										.map((example: string) => (
											<span
												key={example}
												className="px-2 py-1 text-xs rounded-md border border-border bg-muted/50 text-muted-foreground"
											>
												{example}
											</span>
										))}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
