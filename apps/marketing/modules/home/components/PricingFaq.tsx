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
		<section className="section-padding">
			<div className="container">
				<div className="max-w-2xl mx-auto">
					<h2 className="text-2xl font-semibold tracking-tight md:text-3xl text-center leading-[1.08] text-balance text-foreground">
						{t("homePricingFaq.title")}
					</h2>

					<div className="mt-8 gap-2 flex flex-col">
						{FAQ_ITEMS.map((item) => {
							const isOpen = openItem === item;
							return (
								<div
									key={item}
									className="overflow-hidden rounded-xl border border-border/50 bg-card transition-colors duration-200 hover:border-border/80"
								>
									<button
										type="button"
										onClick={() => setOpenItem(isOpen ? null : item)}
										className="px-6 py-4 text-sm font-medium flex w-full items-center justify-between text-left text-foreground transition-colors hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden focus-visible:ring-inset"
										aria-expanded={isOpen}
									>
										{t(`homePricingFaq.items.${item}.q`)}
										<ChevronDownIcon
											className={cn(
												"ml-4 size-4 shrink-0 text-muted-foreground/50 transition-transform duration-200",
												isOpen && "rotate-180",
											)}
										/>
									</button>
									<div
										className={cn(
											"overflow-hidden transition-all duration-200",
											isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
										)}
									>
										<div className="px-6 py-4 text-sm font-normal leading-relaxed border-t border-border/30 text-muted-foreground/80">
											{t(`homePricingFaq.items.${item}.a`)}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</section>
	);
}
