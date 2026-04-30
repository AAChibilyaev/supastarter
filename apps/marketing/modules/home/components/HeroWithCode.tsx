"use client";

import { config } from "@config";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { ArrowRightIcon, Code2Icon, GlobeIcon, ShieldIcon, ZapIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { marketingCtaButtonClassName } from "../../shared/lib/cta-button-styles";

const codeSample = String.raw`import { SearchClient } from "@aacsearch/client";

const search = new SearchClient({
  baseUrl: "https://app.aacsearch.com",
  apiKey: "ss_search_••••••••••••",
  indexSlug: "products",
});

const { hits, found } = await search.search({
  q: "running shoes",
  queryBy: "title,description",
  facetBy: "brand,size",
  filterBy: "in_stock:=true",
});`;

const featureBadges = [
	{ icon: ZapIcon, label: "50ms p99" },
	{ icon: ShieldIcon, label: "Scoped tokens" },
	{ icon: GlobeIcon, label: "Edge network" },
	{ icon: Code2Icon, label: "SDK-first" },
];

export function HeroWithCode() {
	const t = useTranslations("marketing");

	return (
		<section className="relative isolate overflow-hidden border-b border-border/60">
			{/* Layered gradient background */}
			<div className="inset-0 absolute -z-10 bg-gradient-to-br from-primary/5 via-background to-secondary/10" />
			<div className="inset-0 absolute -z-10 bg-[radial-gradient(circle_at_30%_20%,oklch(0.45_0_0/0.08),transparent_55%)]" />
			<div className="inset-0 absolute -z-10 bg-[radial-gradient(circle_at_85%_80%,oklch(0.45_0_0/0.05),transparent_50%)]" />

			<div className="gap-10 py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-24 container grid">
				{/* Left column: text + CTAs */}
				<div className="flex flex-col justify-center">
					{/* Announcement badge */}
					<div className="mb-6 gap-2 px-4 py-1.5 text-sm backdrop-blur-sm inline-flex w-fit items-center rounded-full border border-primary/20 bg-primary/5">
						<span className="size-1.5 rounded-full bg-primary" />
						<span className="font-medium text-primary">{t("home.hero.badge")}</span>
					</div>

					{/* Gradient heading */}
					<h1 className="font-semibold text-4xl tracking-tight md:text-5xl lg:text-6xl text-balance">
						<span className="bg-gradient-to-r from-primary via-primary/80 to-foreground bg-clip-text text-transparent">
							{t("home.hero.title")}
						</span>
					</h1>

					<p className="mt-5 max-w-xl text-base md:text-lg text-pretty text-muted-foreground">
						{t("home.hero.subtitle")}
					</p>

					{/* CTA buttons */}
					<div className="mt-8 gap-3 flex flex-wrap items-center">
						<Button
							className={marketingCtaButtonClassName(true)}
							size="lg"
							variant="primary"
							asChild
						>
							<a href={config.saasUrl ?? "/signup"}>
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

					{/* Feature badge row */}
					<div className="mt-6 gap-2 flex flex-wrap items-center">
						{featureBadges.map(({ icon: Icon, label }) => (
							<Badge
								key={label}
								status="info"
								className="gap-1.5 px-3 py-1 text-xs font-medium normal-case"
							>
								<Icon className="size-3" />
								{label}
							</Badge>
						))}
					</div>
				</div>

				{/* Right column: glass-morphism code card */}
				<div className="relative">
					<Card className="shadow-2xl backdrop-blur-xl overflow-hidden border-border/60 bg-card/40 shadow-primary/5">
						{/* Terminal title bar */}
						<div className="gap-2 px-4 py-3 flex items-center border-b border-border/50">
							<span className="size-2.5 bg-red-500/70 rounded-full" />
							<span className="size-2.5 bg-amber-500/70 rounded-full" />
							<span className="size-2.5 bg-emerald-500/70 rounded-full" />
							<span className="ml-3 text-xs font-mono text-muted-foreground">
								{t("home.hero.codeCaption")}
							</span>
						</div>

						{/* Code block */}
						<CardContent className="p-0">
							<pre className="p-5 font-mono leading-relaxed overflow-x-auto text-[13px] text-foreground/90">
								<code>{highlightCode(codeSample)}</code>
							</pre>
						</CardContent>
					</Card>

					{/* Ambient glow behind the card */}
					<div className="-inset-4 blur-2xl absolute -z-10 rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 opacity-50" />
				</div>
			</div>
		</section>
	);
}

function highlightCode(source: string) {
	const keywords = /\b(import|from|const|await|new|return|true|false)\b/g;
	const strings = /(".*?"|'.*?'|`[\s\S]*?`)/g;
	const fns = /\b(SearchClient|search)\b/g;

	const parts: Array<{ value: string; className?: string }> = [{ value: source }];
	const tokenize = (regex: RegExp, className: string) => {
		const next: typeof parts = [];
		for (const part of parts) {
			if (part.className) {
				next.push(part);
				continue;
			}
			let lastIndex = 0;
			for (const match of part.value.matchAll(regex)) {
				if (match.index === undefined) continue;
				if (match.index > lastIndex) {
					next.push({
						value: part.value.slice(lastIndex, match.index),
					});
				}
				next.push({ value: match[0], className });
				lastIndex = match.index + match[0].length;
			}
			if (lastIndex < part.value.length) {
				next.push({ value: part.value.slice(lastIndex) });
			}
		}
		parts.length = 0;
		parts.push(...next);
	};

	tokenize(strings, "text-amber-200");
	tokenize(keywords, "text-violet-300");
	tokenize(fns, "text-sky-300");

	return parts.map((part, i) =>
		part.className ? (
			<span key={i} className={part.className}>
				{part.value}
			</span>
		) : (
			<span key={i}>{part.value}</span>
		),
	);
}
