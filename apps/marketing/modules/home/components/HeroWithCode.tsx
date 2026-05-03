"use client";

import { config } from "@config";
import { cn } from "@repo/ui";
import { Button } from "@repo/ui/components/button";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { marketingCtaButtonClassName } from "../../shared/lib/cta-button-styles";
import { TrustBadge } from "./TrustBadge";

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

export function HeroWithCode() {
	const t = useTranslations();

	return (
		<section className="border-b border-border py-16 lg:py-28">
			<div className="container grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
				{/* Left: text */}
				<div className="flex flex-col justify-center">
					<div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
						{t("home.hero.badge")}
					</div>

					<h1 className="font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.05] text-balance text-foreground">
						{t("home.hero.title")}
					</h1>

					<p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground text-pretty">
						{t("home.hero.subtitle")}
					</p>

					<div className="mt-8 flex flex-wrap items-center gap-3">
						<Button
							className={cn(marketingCtaButtonClassName(true), "w-full sm:w-auto")}
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
							<Button className="w-full sm:w-auto" variant="outline" size="lg" asChild>
								<a href={config.docsUrl}>{t("home.hero.documentation")}</a>
							</Button>
						)}
					</div>

					<div className="mt-8 border-t border-border pt-6">
						<TrustBadge />
					</div>
				</div>

				{/* Right: code terminal */}
				<div>
					<div className="overflow-hidden rounded-lg border border-border bg-[#0d0d10]">
						<div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
							<span className="size-2.5 rounded-full bg-red-500/70" />
							<span className="size-2.5 rounded-full bg-amber-500/70" />
							<span className="size-2.5 rounded-full bg-emerald-500/70" />
							<span className="ml-3 font-mono text-xs text-white/35">
								{t("home.hero.codeCaption")}
							</span>
						</div>
						<pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-white/75">
							<code>{highlightCode(codeSample)}</code>
						</pre>
					</div>
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
				if (match.index > lastIndex) next.push({ value: part.value.slice(lastIndex, match.index) });
				next.push({ value: match[0], className });
				lastIndex = match.index + match[0].length;
			}
			if (lastIndex < part.value.length) next.push({ value: part.value.slice(lastIndex) });
		}
		parts.length = 0;
		parts.push(...next);
	};

	tokenize(strings, "text-amber-300/90");
	tokenize(keywords, "text-violet-400/90");
	tokenize(fns, "text-pink-400/90");

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
