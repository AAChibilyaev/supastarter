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

const featureBadges = [
	{ icon: ZapIcon, label: "50ms p99" },
	{ icon: ShieldIcon, label: "SOC 2" },
	{ icon: SearchIcon, label: "Full-text" },
	{ icon: BarChart3Icon, label: "Analytics" },
];

const stats = [
	{ value: "2.5M+", label: "Documents indexed" },
	{ value: "< 50ms", label: "Search latency" },
	{ value: "99.99%", label: "Uptime SLA" },
];

export function HeroSection() {
	const t = useTranslations();

	return (
		<section className="relative overflow-hidden">
			{/* Layered gradient background */}
			<div className="inset-0 absolute bg-gradient-to-br from-primary/5 via-background to-secondary/10" />
			<div className="inset-0 absolute bg-[radial-gradient(circle_at_20%_30%,oklch(0.45_0_0/0.06),transparent_50%)]" />
			<div className="inset-0 absolute bg-[radial-gradient(circle_at_80%_70%,oklch(0.45_0_0/0.04),transparent_50%)]" />

			<div className="py-16 md:py-24 lg:py-32 relative z-10 container">
				{/* Announcement badge */}
				<div className="mb-6 flex justify-center">
					<div className="gap-2 px-4 py-1.5 text-sm backdrop-blur-sm inline-flex items-center rounded-full border border-primary/20 bg-primary/5">
						<span className="font-semibold text-primary">{t("home.hero.new")}</span>
						<span className="h-4 w-px bg-primary/20" />
						<span className="font-medium text-muted-foreground">
							{t("home.hero.featureBadge")}
						</span>
					</div>
				</div>

				{/* Gradient heading */}
				<h1 className="max-w-4xl font-semibold text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-tight mx-auto text-center text-balance">
					<span className="bg-gradient-to-r from-primary via-primary/80 to-foreground bg-clip-text text-transparent">
						{t("home.hero.title")}
					</span>
				</h1>

				<p className="mt-6 max-w-2xl text-base sm:text-lg mx-auto text-center text-pretty text-muted-foreground">
					{t("home.hero.subtitle")}
				</p>

				{/* CTA buttons — single row; scroll on narrow widths */}
				<div className="mt-8 w-full overflow-x-auto">
					<div className="mx-auto flex w-max items-center justify-center gap-3">
						<Button
							className={cn(marketingCtaButtonClassName(true), "shrink-0")}
							size="lg"
							variant="primary"
							asChild
						>
							<a href={config.saasUrl}>
								{t("home.hero.getStarted")}
								<ArrowRightIcon className="ml-2 size-4" />
							</a>
						</Button>
						{config.docsUrl && (
							<Button className="shrink-0" variant="ghost" size="lg" asChild>
								<a href={config.docsUrl}>{t("home.hero.documentation")}</a>
							</Button>
						)}
					</div>
				</div>

				{/* Feature badge row — single line; scroll on narrow widths */}
				<div className="mt-8 w-full overflow-x-auto">
					<div className="mx-auto flex w-max items-center gap-2">
						{featureBadges.map(({ icon: Icon, label }) => (
							<Badge
								key={label}
								status="info"
								className="shrink-0 gap-1.5 whitespace-nowrap px-3 py-1 text-xs font-medium normal-case"
							>
								<Icon className="size-3" />
								{label}
							</Badge>
						))}
					</div>
				</div>

				{/* Hero image in glass-morphism card */}
				<div className="mt-12 lg:mt-16 max-w-5xl mx-auto">
					<div className="shadow-2xl backdrop-blur-sm relative overflow-hidden rounded-xl border border-border/50 bg-card/40 shadow-primary/5">
						<Image
							src={heroImage}
							alt={t("home.hero.imageAlt")}
							className="block w-full dark:hidden"
							priority
						/>
						<Image
							src={heroImageDark}
							alt={t("home.hero.imageAlt")}
							className="hidden w-full dark:block"
							priority
						/>
					</div>
				</div>

				{/* Stats row */}
				<div className="mt-12 gap-4 sm:gap-8 max-w-2xl mx-auto grid grid-cols-3">
					{stats.map(({ value, label }) => (
						<div key={label} className="text-center">
							<div className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
								{value}
							</div>
							<div className="mt-1 text-xs sm:text-sm text-muted-foreground">
								{label}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
