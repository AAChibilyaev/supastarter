import { Card, CardContent } from "@repo/ui/components/card";
import {
	BookOpenIcon,
	BriefcaseIcon,
	Building2Icon,
	Code2Icon,
	NewspaperIcon,
	ShoppingCartIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface UseCaseItem {
	key: string;
	icon: ComponentType<{ className?: string }>;
}

const items: UseCaseItem[] = [
	{ key: "ecommerce", icon: ShoppingCartIcon },
	{ key: "helpCenter", icon: BookOpenIcon },
	{ key: "multiTenant", icon: Building2Icon },
	{ key: "developerTools", icon: Code2Icon },
	{ key: "internalTools", icon: BriefcaseIcon },
	{ key: "contentSites", icon: NewspaperIcon },
];

export function UseCasesGrid() {
	const t = useTranslations("home");

	return (
		<section className="py-16 md:py-24 border-b border-border">
			<div className="container">
				<div className="max-w-3xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-bold tracking-tight text-balance">
						{t("useCases.title")}
					</h2>
				</div>

				<div className="mt-12 md:mt-16 sm:grid-cols-2 lg:grid-cols-3 gap-4 grid grid-cols-1">
					{items.map(({ key, icon: Icon }) => (
						<Card key={key} className="text-left">
							<CardContent className="p-6 md:p-8 gap-3 flex flex-col">
								<div className="gap-3 flex items-center">
									<div className="size-10 flex shrink-0 items-center justify-center rounded-lg bg-muted">
										<Icon className="size-5 text-muted-foreground" />
									</div>
									<h3 className="text-lg font-semibold">
										{t(`useCases.items.${key}.title`)}
									</h3>
								</div>
								<p className="text-sm font-light leading-relaxed text-pretty text-muted-foreground">
									{t(`useCases.items.${key}.description`)}
								</p>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
