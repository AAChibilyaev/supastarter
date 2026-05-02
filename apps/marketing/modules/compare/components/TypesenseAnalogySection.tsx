"use client";

import { Card, CardContent } from "@repo/ui";
import { useTranslations } from "next-intl";

export function TypesenseAnalogySection() {
	const t = useTranslations("compareTypesense");

	return (
		<section className="py-24 border-b border-border/60">
			<div className="container">
				<div className="max-w-3xl mx-auto">
					<h2 className="font-medium text-3xl tracking-tight md:text-4xl mb-8 text-center text-balance">
						{t("analogy.heading")}
					</h2>
					<Card className="p-8 md:p-10 border-dashed bg-muted/30">
						<CardContent className="p-0 space-y-4">
							<p className="text-lg md:text-xl leading-relaxed text-foreground/90">
								{t("analogy.line1")}
							</p>
							<p className="text-lg md:text-xl leading-relaxed font-semibold text-primary">
								{t("analogy.line2")}
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</section>
	);
}
