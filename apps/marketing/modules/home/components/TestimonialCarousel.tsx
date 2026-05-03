"use client";

import { cn } from "@repo/ui";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

interface Testimonial {
	quote: string;
	author: string;
	role: string;
	company: string;
	initials: string;
}

const TESTIMONIALS: Testimonial[] = [
	{
		quote: "Switching to AACsearch was the easiest infrastructure decision we've made. We cut costs by 5x, our search is faster, and the built-in analytics showed us product gaps we didn't know we had.",
		author: "Erik Lindström",
		role: "CTO",
		company: "NordikHome",
		initials: "EL",
	},
	{
		quote: "With AACsearch, we provision a new client's search in 15 minutes. Each client thinks they have their own dedicated search infrastructure — and they do. We just manage it all from one dashboard.",
		author: "Marcus Weber",
		role: "Technical Director",
		company: "AgencyHub",
		initials: "MW",
	},
	{
		quote: "Elasticsearch was eating 20 hours of our engineering team's week. AACsearch gave us better search with zero maintenance. Our team got 20 hours back, literally overnight.",
		author: "Priya Sharma",
		role: "VP Engineering",
		company: "DevStream",
		initials: "PS",
	},
];

export function TestimonialCarousel() {
	const t = useTranslations("home");
	const [activeIndex, setActiveIndex] = useState(0);
	const [isPaused, setIsPaused] = useState(false);

	const next = useCallback(() => {
		setActiveIndex((prev) => (prev + 1) % TESTIMONIALS.length);
	}, []);

	useEffect(() => {
		if (isPaused) return;
		const interval = setInterval(next, 6000);
		return () => clearInterval(interval);
	}, [isPaused, next]);

	const testimonial = TESTIMONIALS[activeIndex]!;

	return (
		<section className="border-b border-border py-14 md:py-24">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="font-bold text-3xl tracking-tight leading-tight text-balance md:text-4xl">
						{t("testimonials.title")}
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
						{t("testimonials.subtitle")}
					</p>
				</div>

				<div
					className="mt-12 max-w-3xl mx-auto"
					onMouseEnter={() => setIsPaused(true)}
					onMouseLeave={() => setIsPaused(false)}
				>
					<div className="rounded-lg border border-border bg-card p-6 sm:p-10">
						<blockquote className="text-lg md:text-xl leading-relaxed text-foreground text-pretty">
							"{testimonial.quote}"
						</blockquote>

						<div className="mt-8 flex items-center gap-4 border-t border-border pt-6">
							<div className="size-10 flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-sm text-primary-foreground select-none">
								{testimonial.initials}
							</div>
							<div>
								<p className="font-semibold text-sm text-foreground">
									{testimonial.author}
								</p>
								<p className="text-xs text-muted-foreground">
									{testimonial.role}, {testimonial.company}
								</p>
							</div>
						</div>
					</div>

					{/* Progress dots */}
					<div className="mt-5 flex items-center justify-center gap-2">
						{TESTIMONIALS.map((_, index) => (
							<button
								key={index}
								type="button"
								onClick={() => setActiveIndex(index)}
								className={cn(
									"h-1.5 rounded-full transition-all duration-300",
									index === activeIndex
										? "w-8 bg-primary"
										: "w-1.5 bg-border hover:bg-muted-foreground/40",
								)}
								aria-label={t("testimonials.dotLabel", { number: index + 1 })}
							/>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
