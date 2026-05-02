"use client";

import { Card, CardContent } from "@repo/ui";
import { useTranslations } from "next-intl";

export function TypesenseTestimonial() {
	const t = useTranslations("compareTypesense");

	return (
		<section className="py-24 border-b border-border/60">
			<div className="container">
				<div className="max-w-3xl mx-auto">
					<Card className="p-8 md:p-10 relative">
						<div className="text-6xl -top-4 -left-2 absolute leading-none text-primary/20 select-none">
							&quot;
						</div>
						<CardContent className="p-0">
							<blockquote className="text-lg md:text-xl leading-relaxed text-foreground/90 italic">
								{t("testimonial.quote")}
							</blockquote>
							<footer className="mt-6 pt-4 text-sm border-t border-border/60 text-muted-foreground">
								— {t("testimonial.author")}
							</footer>
						</CardContent>
					</Card>
				</div>
			</div>
		</section>
	);
}
