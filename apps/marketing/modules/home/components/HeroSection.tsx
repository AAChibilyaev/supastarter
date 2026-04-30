"use client";

import { config } from "@config";
import { Button } from "@repo/ui/components/button";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

import heroImageDark from "../../../public/images/hero-image-dark.png";
import heroImage from "../../../public/images/hero-image.png";
import { marketingCtaButtonClassName } from "../../shared/lib/cta-button-styles";

export function HeroSection() {
	const t = useTranslations();

	return (
		<div className="relative max-w-full overflow-x-hidden bg-linear-to-t from-background via-muted/60 to-background">
			<div className="py-8 md:py-16 relative z-20 container text-center">
				<div className="mb-4 flex justify-center">
					<div className="px-3 py-1 font-normal text-sm flex flex-wrap items-center justify-center rounded-none bg-muted p-px text-foreground">
						<span className="gap-2 font-semibold flex items-center rounded-none">
							{t("home.hero.new")}
						</span>
						<span className="ml-1 font-medium block">
							{t("home.hero.featureBadge")}
						</span>
					</div>
				</div>

				<h1 className="font-medium text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-tighter max-w-3xl mx-auto text-balance text-foreground">
					{t("home.hero.title")}
				</h1>

				<p className="mt-2 text-sm sm:text-lg max-w-3xl mx-auto text-balance text-foreground/60">
					{t("home.hero.subtitle")}
				</p>

				<div className="mt-4 gap-2 flex items-center justify-center">
					<Button
						className={marketingCtaButtonClassName(true)}
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
						<Button variant="ghost" size="lg" asChild>
							<a href={config.docsUrl}>{t("home.hero.documentation")}</a>
						</Button>
					)}
				</div>

				<div className="mt-12 lg:mt-16 lg:flex-1 p-4 mx-auto rounded-sm border border-border/70 bg-card/50">
					<Image
						src={heroImage}
						alt={t("home.hero.imageAlt")}
						className="block rounded-sm dark:hidden"
						priority
					/>
					<Image
						src={heroImageDark}
						alt={t("home.hero.imageAlt")}
						className="hidden rounded-sm dark:block"
						priority
					/>
				</div>
			</div>
		</div>
	);
}
