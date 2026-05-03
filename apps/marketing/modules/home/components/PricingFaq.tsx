"use client";

import { cn } from "@repo/ui";
import { ChevronDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

const FAQ_ITEMS = ["unit", "overage", "comparison", "free", "migration"] as const;

export function PricingFaq() {
	const t = useTranslations();
	const [openItem, setOpenItem] = useState<string | null>(null);

	return (
		<section className="section-padding border-b border-border bg-muted/30">
			<div className="container">
				<div className="max-w-2xl mx-auto">
					<h2 className="text-2xl md:text-3xl font-light tracking-tight text-balance text-center">
						{t("homePricingFaq.title")}
					</h2>

					<div className="mt-8 gap-2 flex flex-col">
						{FAQ_ITEMS.map((item) => {
							const isOpen = openItem === item;
							return (
								<div
									key={item}
									className="overflow-hidden rounded-lg border border-border bg-card"
								>
									<button
										type="button"
										onClick={() => setOpenItem(isOpen ? null : item)}
										className="w-full px-5 py-4 flex items-center justify-between text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
									>
										<span>{t(`homePricingFaq.items.${item}.q`)}</span>
										<ChevronDownIcon
											className={cn(
												"size-4 shrink-0 text-muted-foreground transition-transform duration-200",
												isOpen && "rotate-180",
											)}
										/>
									</button>
									{isOpen && (
										<div className="px-5 pb-4 text-sm font-light leading-relaxed text-muted-foreground">
											{t(`homePricingFaq.items.${item}.a`)}
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</section>
	);
}
