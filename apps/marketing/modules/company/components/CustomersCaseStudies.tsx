"use client";

import type { Post } from "@blog/types";
import { LocaleLink } from "@i18n/routing";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

interface CustomersCaseStudiesProps {
	caseStudies: Post[];
}

export function CustomersCaseStudies({ caseStudies }: CustomersCaseStudiesProps) {
	const t = useTranslations("customersPage");

	return (
		<section className="section-padding border-b border-border/60">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
						{t("caseStudies.title")}
					</h2>
					<p className="mt-4 text-lg text-muted-foreground">
						{t("caseStudies.description")}
					</p>
				</div>

				<div className="mt-16 gap-6 sm:grid-cols-2 md:grid-cols-3 grid grid-cols-1">
					{caseStudies.map((post) => {
						const { title, excerpt, image, path } = post;
						return (
							<Card
								key={path}
								className="group transition-all duration-300 hover:border-primary/30 hover:bg-accent/5"
							>
								{image && (
									<div className="relative aspect-[16/9] overflow-hidden rounded-t-xl">
										<Image
											src={image}
											alt={title}
											fill
											sizes="(max-width: 768px) 100vw, 33vw"
											className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
										/>
									</div>
								)}
								<CardTitle className="p-6 pb-2 text-xl">{title}</CardTitle>
								<CardContent>
									<CardDescription className="text-sm leading-relaxed line-clamp-2">
										{excerpt}
									</CardDescription>
									<LocaleLink
										href={`/blog/${path}`}
										className="mt-4 gap-1.5 text-sm font-medium inline-flex items-center text-primary hover:underline"
									>
										{t("caseStudies.readFullStudy")}
										<ArrowRightIcon className="size-3.5" />
									</LocaleLink>
								</CardContent>
							</Card>
						);
					})}
				</div>
			</div>
		</section>
	);
}
