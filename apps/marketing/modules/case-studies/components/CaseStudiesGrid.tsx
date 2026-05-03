"use client";

import type { Post } from "@blog/types";
import { LocaleLink } from "@i18n/routing";
import { useTranslations } from "next-intl";
import Image from "next/image";

interface CaseStudiesGridProps {
	caseStudies: Post[];
}

export function CaseStudiesGrid({ caseStudies }: CaseStudiesGridProps) {
	const t = useTranslations("caseStudiesPage");

	return (
		<section className="py-24">
			<div className="container">
				<div className="gap-6 md:grid-cols-2 lg:grid-cols-3 grid grid-cols-1">
					{caseStudies.map((post) => {
						const { title, excerpt, authorName, image, path, authorImage, tags } = post;
						const displayTags = tags.filter((tag) => tag !== "case-study");

						return (
							<article
								key={path}
								className="group p-6 rounded-4xl border bg-card transition-all duration-300 hover:border-primary/30 hover:bg-accent/5"
							>
								{image && (
									<div className="mb-4 -mx-2 -mt-2 relative aspect-[16/10] overflow-hidden rounded-2xl">
										<Image
											src={image}
											alt={title}
											fill
											sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
											className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
										/>
										<LocaleLink
											href={`/blog/${path}`}
											className="inset-0 absolute"
											aria-label={title}
										/>
									</div>
								)}

								{displayTags.length > 0 && (
									<div className="mb-2 min-w-0 gap-2 flex items-center overflow-x-auto">
										{displayTags.map((tag) => (
											<span
												key={tag}
												className="font-semibold text-xs tracking-wider shrink-0 whitespace-nowrap text-primary uppercase"
											>
												#{tag}
											</span>
										))}
									</div>
								)}

								<LocaleLink
									href={`/blog/${path}`}
									className="font-semibold text-xl leading-tight transition-colors group-hover:text-primary"
								>
									{title}
								</LocaleLink>

								{excerpt && (
									<p className="mt-2 text-sm leading-relaxed line-clamp-3 text-muted-foreground">
										{excerpt}
									</p>
								)}

								<div className="mt-6 pt-4 flex items-center justify-between border-t border-border/30">
									{authorName && (
										<div className="flex items-center">
											{authorImage && (
												<div className="mr-2 size-8 relative overflow-hidden rounded-full">
													<Image
														src={authorImage}
														alt={authorName}
														fill
														sizes="96px"
														className="object-cover object-center"
													/>
												</div>
											)}
											<span className="text-sm font-medium text-muted-foreground">
												{authorName}
											</span>
										</div>
									)}

									<LocaleLink
										href={`/blog/${path}`}
										className="text-sm font-medium text-primary hover:underline"
									>
										{t("readCaseStudy")}
									</LocaleLink>
								</div>
							</article>
						);
					})}
				</div>
			</div>
		</section>
	);
}
