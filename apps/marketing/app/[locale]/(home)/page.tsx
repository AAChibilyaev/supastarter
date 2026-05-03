import { config } from "@config";
import {
	LandingBentoGridSection,
	LandingBentoGridItem,
	LandingDiscount,
	LandingFeature,
	LandingFeatureList,
	LandingMarquee,
	LandingPrimaryTextCtaSection,
	LandingSaleCtaSection,
	LandingStatsSection,
	LandingTestimonialGrid,
} from "@repo/ui";
import type { TestimonialItem } from "@repo/ui";
import {
	ArrowRightIcon,
	BarChart3Icon,
	GitBranchIcon,
	GlobeLockIcon,
	KeyRoundIcon,
	LayersIcon,
	ShieldCheckIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: "home" });
	return {
		title: t("hero.title"),
		description: t("hero.subtitle"),
		openGraph: {
			title: t("hero.title"),
			description: t("hero.subtitle"),
		},
	};
}

const testimonials: TestimonialItem[] = [
	{
		text: "Switching to AACsearch was the easiest infrastructure decision we've made. We cut costs by 5x, our search is faster, and the built-in analytics showed us product gaps we didn't know we had.",
		imageSrc: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23fde0e8' rx='20'/%3E%3Ctext x='20' y='26' text-anchor='middle' font-size='16' fill='%23fd366e' font-weight='bold'%3EEL%3C/text%3E%3C/svg%3E",
		name: "Erik Lindström",
		handle: "CTO, NordikHome",
	},
	{
		text: "With AACsearch, we provision a new client's search in 15 minutes. Each client thinks they have their own dedicated search infrastructure — and they do. We just manage it all from one dashboard.",
		imageSrc: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23fde0e8' rx='20'/%3E%3Ctext x='20' y='26' text-anchor='middle' font-size='16' fill='%23fd366e' font-weight='bold'%3EMW%3C/text%3E%3C/svg%3E",
		name: "Marcus Weber",
		handle: "Technical Director, AgencyHub",
	},
	{
		text: "Elasticsearch was eating 20 hours of our engineering team's week. AACsearch gave us better search with zero maintenance. Our team got 20 hours back, literally overnight.",
		imageSrc: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23fde0e8' rx='20'/%3E%3Ctext x='20' y='26' text-anchor='middle' font-size='16' fill='%23fd366e' font-weight='bold'%3EPS%3C/text%3E%3C/svg%3E",
		name: "Priya Sharma",
		handle: "VP Engineering, DevStream",
	},
];

const logos = [
	{ label: "NordikHome", emoji: "🏠" },
	{ label: "AgencyHub", emoji: "🏢" },
	{ label: "DevStream", emoji: "⚡" },
	{ label: "DataForge", emoji: "🔧" },
	{ label: "CloudStack", emoji: "☁️" },
	{ label: "NeoSearch", emoji: "🔍" },
	{ label: "FlowState", emoji: "🌊" },
	{ label: "Archetype", emoji: "🏛️" },
];

const features = [
	{ key: "scopedTokens", icon: KeyRoundIcon, span: "md:col-span-2" },
	{ key: "originAllowlist", icon: GlobeLockIcon, span: "" },
	{ key: "rateLimitQuota", icon: BarChart3Icon, span: "" },
	{ key: "multiSearch", icon: LayersIcon, span: "" },
	{ key: "reindex", icon: GitBranchIcon, span: "" },
	{ key: "enterpriseSecurity", icon: ShieldCheckIcon, span: "md:col-span-2" },
];

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "home" });

	return (
		<>
			{/* ─── 1. HERO ─── */}
			<LandingPrimaryTextCtaSection
				title={t("hero.title")}
				description={t("hero.subtitle")}
				textPosition="center"
				withBackgroundGlow
			>
				<a
					href={config.saasUrl ?? "#"}
					className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
				>
					{t("hero.getStarted")}
					<ArrowRightIcon className="size-4" />
				</a>
				{config.docsUrl && (
					<a
						href={config.docsUrl}
						className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-6 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
					>
						{t("hero.documentation")}
					</a>
				)}
			</LandingPrimaryTextCtaSection>

			{/* ─── 2. STATS ─── */}
			<LandingStatsSection
				stats={[
					{ value: "2.5M+", description: "Documents indexed per org" },
					{ value: "<50ms", description: "p99 search latency" },
					{ value: "99.99%", description: "Uptime SLA" },
				]}
				hasBorders
				textPosition="center"
			/>

			{/* ─── 3. FEATURES Bento Grid ─── */}
			<LandingBentoGridSection
				titleComponent={
					<div className="mx-auto max-w-2xl">
						<h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
							{t("features.title")}
						</h2>
						<p className="mt-4 text-lg text-muted-foreground">
							{t("features.subtitle")}
						</p>
					</div>
				}
			>
				{features.map(({ key, icon: Icon, span }) => (
					<LandingBentoGridItem
						key={key}
						titleComponent={
							<div className="flex items-center gap-3">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
									<Icon className="size-5 text-foreground" />
								</div>
								<span className="text-base font-semibold text-foreground">
									{t(`features.items.${key}.title`)}
								</span>
							</div>
						}
						description={t(`features.items.${key}.description`)}
						className={`bg-card ${span}`}
					/>
				))}
			</LandingBentoGridSection>

			{/* ─── 4. HOW IT WORKS ─── */}
			<LandingFeatureList title={t("howItWorks.title")}>
				<LandingFeature
					title={t("howItWorks.step1.title")}
					description={t("howItWorks.step1.description")}
					icon={<span className="text-xl font-bold text-primary">1</span>}
				/>
				<LandingFeature
					title={t("howItWorks.step2.title")}
					description={t("howItWorks.step2.description")}
					icon={<span className="text-xl font-bold text-primary">2</span>}
				/>
				<LandingFeature
					title={t("howItWorks.step3.title")}
					description={t("howItWorks.step3.description")}
					icon={<span className="text-xl font-bold text-primary">3</span>}
				/>
			</LandingFeatureList>

			{/* ─── 5. TESTIMONIALS ─── */}
			<LandingTestimonialGrid
				testimonialItems={testimonials}
				withBackground
				withBackgroundGlow
			/>

			{/* ─── 6. LOGOS MARQUEE ─── */}
			<LandingMarquee>
				{logos.map((logo) => (
					<div
						key={logo.label}
						className="mx-8 flex items-center gap-3"
					>
						<div className="flex size-10 items-center justify-center rounded-lg border border-border bg-card">
							<span className="text-lg">{logo.emoji}</span>
						</div>
						<span className="text-sm font-medium text-muted-foreground">
							{logo.label}
						</span>
					</div>
				))}
			</LandingMarquee>

			{/* ─── 7. CTA + DISCOUNT ─── */}
			<LandingSaleCtaSection
				title={t("cta.title")}
				description={t("cta.subtitle")}
				ctaHref={config.saasUrl ?? "#"}
				ctaLabel={t("cta.primary")}
				secondaryCtaHref={config.docsUrl ?? "#"}
				secondaryCtaLabel={t("cta.secondary")}
				withBackgroundGlow
			>
				<LandingDiscount
					discountValueText="14-day free trial"
					discountDescriptionText="No credit card required"
					animated
				/>
			</LandingSaleCtaSection>
		</>
	);
}
