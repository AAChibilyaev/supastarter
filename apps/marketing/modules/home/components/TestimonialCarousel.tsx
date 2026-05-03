"use client";

import { cn } from "@repo/ui";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

interface Testimonial {
	quote: string;
	author: string;
	role: string;
	company: string;
	initials: string;
}

const TESTIMONIAL_IDS = ["nordikHome", "agencyHub", "devStream"] as const;

export function TestimonialCarousel() {
	const t = useTranslations("home");
	const [activeIndex, setActiveIndex] = useState(0);
	const [isPaused, setIsPaused] = useState(false);

	const testimonials = useMemo<Testimonial[]>(
		() =>
			TESTIMONIAL_IDS.map((id) => ({
				quote: t(`testimonials.items.${id}.quote`),
				author: t(`testimonials.items.${id}.author`),
				role: t(`testimonials.items.${id}.role`),
				company: t(`testimonials.items.${id}.company`),
				initials: t(`testimonials.items.${id}.initials`),
			})),
		[t],
	);

	const next = useCallback(() => {
		setActiveIndex((prev) => (prev + 1) % testimonials.length);
	}, [testimonials.length]);

	useEffect(() => {
		if (isPaused) return;
		const interval = setInterval(next, 6000);
		return () => clearInterval(interval);
	}, [isPaused, next]);

	const testimonial = testimonials[activeIndex]!;

	return (
		<section className="section-padding border-b border-border">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						{t("testimonials.title")}
					</h2>

					<p className="mt-4 text-lg font-light max-w-2xl mx-auto text-balance text-muted-foreground">
						{t("testimonials.subtitle")}
					</p>
				</div>

				<div
					className="mt-12 max-w-3xl mx-auto"
					onMouseEnter={() => setIsPaused(true)}
					onMouseLeave={() => setIsPaused(false)}
				>
					<div className="p-6 sm:p-10 rounded-lg border border-border bg-card">
						<blockquote className="text-xl leading-relaxed md:text-2xl text-pretty text-foreground">
							&ldquo;{testimonial.quote}&rdquo;
						</blockquote>

						<div className="mt-8 gap-4 pt-6 flex items-center border-t border-border">
							<div className="size-10 text-sm font-light flex shrink-0 items-center justify-center rounded-full bg-muted text-foreground select-none">
								{testimonial.initials}
							</div>
							<div>
								<p className="text-sm font-light text-foreground">
									{testimonial.author}
								</p>
								<p className="text-xs font-light text-muted-foreground">
									{testimonial.role}, {testimonial.company}
								</p>
							</div>
						</div>
					</div>

					{/* Simple circle progress dots */}
					<div className="mt-6 gap-2 flex items-center justify-center">
						{testimonials.map((_, index) => (
							<button
								key={index}
								type="button"
								onClick={() => setActiveIndex(index)}
								className="flex items-center justify-center p-3"
								aria-label={t("testimonials.dotLabel", { number: index + 1 })}
							>
								<span
									className={cn(
										"block size-2.5 rounded-full transition-all duration-300",
										index === activeIndex
											? "bg-foreground"
											: "bg-muted-foreground/30 hover:bg-muted-foreground/50",
									)}
								/>
							</button>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
