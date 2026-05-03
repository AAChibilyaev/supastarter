"use client";

import { config } from "@config";
import { cn } from "@repo/ui";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { ArrowRightIcon, BarChart3Icon, SearchIcon, ShieldIcon, ZapIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

import heroImageDark from "../../../public/images/hero-image-dark.png";
import heroImage from "../../../public/images/hero-image.png";
import { marketingCtaButtonClassName } from "../../shared/lib/cta-button-styles";

export function HeroSection() {
	const t = useTranslations("home");

	const featureBadges = [
		{ icon: ZapIcon, label: t("hero.badgeLatency") },
		{ icon: ShieldIcon, label: t("hero.badgeSoc2") },
		{ icon: SearchIcon, label: t("hero.badgeFulltext") },
		{ icon: BarChart3Icon, label: t("hero.badgeAnalytics") },
	];

	const stats = [
		{ value: "2.5M+", label: t("hero.statDocs") },
		{ value: "< 50ms", label: t("hero.statLatency") },
		{ value: "99.99%", label: t("hero.statUptime") },
	];

	return (
		<section className="relative overflow-hidden bg-background">
			<div className="section-padding relative z-10 container">
				{/* Announcement badge */}
				<div className="mb-6 flex justify-center">
					<div className="gap-2 px-4 py-1.5 text-sm inline-flex items-center rounded-full border">
						<span className="font-semibold text-primary">{t("hero.new")}</span>
						<span className="h-4 w-px bg-border" />
						<span className="font-light text-muted-foreground">
							{t("hero.featureBadge")}
						</span>
					</div>
				</div>

				{/* Hero heading */}
				<h1 className="max-w-4xl text-4xl md:text-5xl lg:text-6xl font-light mx-auto text-center text-balance text-foreground">
					{t("hero.title")}
				</h1>

				{/* Subtitle */}
				<p className="mt-6 max-w-2xl text-base sm:text-lg font-light mx-auto text-center text-balance text-muted-foreground">
					{t("hero.subtitle")}
				</p>

				{/* CTA buttons */}
				<div className="mt-8 gap-3 flex w-full items-center justify-center">
					<Button
						className={cn(marketingCtaButtonClassName(true), "shrink-0")}
						size="lg"
						variant="primary"
						asChild
					>
						<a href={config.saasUrl}>
							{t("hero.getStarted")}
							<ArrowRightIcon className="ml-2 size-4" />
						</a>
					</Button>
					{config.docsUrl && (
						<Button className="shrink-0" variant="outline" size="lg" asChild>
							<a href={config.docsUrl}>{t("hero.documentation")}</a>
						</Button>
					)}
				</div>

				{/* Feature badges */}
				<div className="mt-8 gap-2 flex w-full flex-wrap items-center justify-center">
					{featureBadges.map(({ icon: Icon, label }) => (
						<Badge
							key={label}
							status="info"
							className="gap-1.5 px-3 py-1 text-xs font-light shrink-0 whitespace-nowrap normal-case"
						>
							<Icon className="size-3" />
							{label}
						</Badge>
					))}
				</div>

				{/* Hero image */}
				<div className="mt-12 max-w-5xl lg:mt-16 mx-auto">
					<div className="shadow-lg overflow-hidden rounded-xl border">
						<Image
							src={heroImage}
							alt={t("hero.imageAlt")}
							className="block w-full dark:hidden"
							priority
						/>
						<Image
							src={heroImageDark}
							alt={t("hero.imageAlt")}
							className="hidden w-full dark:block"
							priority
						/>
					</div>
				</div>

				{/* Stats row */}
				<div className="mt-12 max-w-2xl gap-4 sm:gap-8 mx-auto grid grid-cols-3">
					{stats.map(({ value, label }) => (
						<div key={label} className="text-center">
							<div className="text-2xl font-bold sm:text-3xl text-foreground tabular-nums">
								{value}
							</div>
							<div className="mt-1 text-xs sm:text-sm font-light text-muted-foreground">
								{label}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
