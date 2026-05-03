"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";

interface Testimonial {
	quote: string;
	author: string;
	role: string;
	company: string;
	avatar: string;
	initials: string;
}

const TESTIMONIALS: Testimonial[] = [
	{
		quote: "Switching to AACsearch was the easiest infrastructure decision we've made. We cut costs by 5x, our search is faster, and the built-in analytics showed us product gaps we didn't know we had.",
		author: "Erik Lindström",
		role: "CTO",
		company: "NordikHome",
		avatar: "",
		initials: "EL",
	},
	{
		quote: "With AACsearch, we provision a new client's search in 15 minutes. Each client thinks they have their own dedicated search infrastructure — and they do. We just manage it all from one dashboard.",
		author: "Marcus Weber",
		role: "Technical Director",
		company: "AgencyHub",
		avatar: "",
		initials: "MW",
	},
	{
		quote: "Elasticsearch was eating 20 hours of our engineering team's week. AACsearch gave us better search with zero maintenance. Our team got 20 hours back, literally overnight.",
		author: "Priya Sharma",
		role: "VP Engineering",
		company: "DevStream",
		avatar: "",
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

	const prev = useCallback(() => {
		setActiveIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
	}, []);

	useEffect(() => {
		if (isPaused) return;
		const interval = setInterval(next, 6000);
		return () => clearInterval(interval);
	}, [isPaused, next]);

	const testimonial = TESTIMONIALS[activeIndex]!;

	return (
		<section className="py-24 border-b border-border/60">
			<div className="container">
				<h2 className="font-semibold text-3xl tracking-tight leading-tight text-center text-balance md:text-4xl">
					{t("testimonials.title")}
				</h2>
				<p className="mt-4 text-lg leading-relaxed text-center text-muted-foreground">
					{t("testimonials.subtitle")}
				</p>

				<div
					className="mt-12 max-w-3xl mx-auto"
					onMouseEnter={() => setIsPaused(true)}
					onMouseLeave={() => setIsPaused(false)}
				>
					<div className="p-10 relative rounded-3xl border bg-card transition-all duration-300">
						{/* Quote icon */}
						<div className="mb-4 text-6xl leading-none text-primary/20 select-none">
							&ldquo;
						</div>

						<blockquote className="text-lg md:text-xl leading-relaxed text-foreground">
							{testimonial.quote}
						</blockquote>

						<div className="mt-6 gap-4 flex items-center">
							<div className="size-12 font-bold text-sm flex items-center justify-center rounded-full bg-primary/10 text-primary select-none">
								{testimonial.initials}
							</div>
							<div>
								<p className="font-semibold text-foreground">
									{testimonial.author}
								</p>
								<p className="text-sm text-muted-foreground">
									{testimonial.role}, {testimonial.company}
								</p>
							</div>
						</div>
					</div>

					{/* Navigation dots */}
					<div className="mt-6 gap-3 flex items-center justify-center">
						{TESTIMONIALS.map((_, index) => (
							<button
								key={index}
								type="button"
								onClick={() => setActiveIndex(index)}
								className={`size-2.5 rounded-full transition-all duration-300 ${
									index === activeIndex
										? "w-8 bg-primary"
										: "bg-muted-foreground/30 hover:bg-muted-foreground/50"
								}`}
								aria-label={t("testimonials.dotLabel", { number: index + 1 })}
							/>
						))}
					</div>

					{/* Prev/Next buttons */}
					<div className="mt-4 gap-3 flex items-center justify-center">
						<button
							type="button"
							onClick={prev}
							className="px-4 py-2 text-sm rounded-xl border border-border/60 bg-card transition-colors hover:border-primary/30 hover:bg-accent/10"
							aria-label={t("testimonials.prevLabel")}
						>
							&larr; {t("testimonials.prev")}
						</button>
						<button
							type="button"
							onClick={next}
							className="px-4 py-2 text-sm rounded-xl border border-border/60 bg-card transition-colors hover:border-primary/30 hover:bg-accent/10"
							aria-label={t("testimonials.nextLabel")}
						>
							{t("testimonials.next")} &rarr;
						</button>
					</div>
				</div>
			</div>
		</section>
	);
}
