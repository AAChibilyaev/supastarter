import { config } from "@config";
import { Button } from "@repo/ui/components/button";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

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
		<section className="relative isolate overflow-hidden border-b border-border/60">
			<div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,oklch(0.55_0.18_155/0.18),transparent_55%)]" />
			<div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_80%,oklch(0.55_0.18_155/0.10),transparent_50%)]" />
			<div className="container grid gap-10 py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-24">
				<div className="flex flex-col justify-center">
					<div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1 font-mono text-xs text-muted-foreground backdrop-blur">
						<span className="size-1.5 rounded-full bg-emerald-400" />
						{t("home.hero.badge")}
					</div>

					<h1 className="text-balance font-medium text-4xl text-foreground tracking-tight md:text-5xl lg:text-6xl">
						{t("home.hero.title")}
					</h1>

					<p className="mt-5 max-w-xl text-pretty text-base text-muted-foreground md:text-lg">
						{t("home.hero.subtitle")}
					</p>

					<div className="mt-8 flex flex-wrap items-center gap-3">
						<Button size="lg" variant="primary" asChild>
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
				</div>

				<div className="relative">
					<div className="relative overflow-hidden rounded-xl border border-border/80 bg-card/50 shadow-2xl shadow-emerald-500/5 backdrop-blur">
						<div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
							<span className="size-2.5 rounded-full bg-muted-foreground/30" />
							<span className="size-2.5 rounded-full bg-muted-foreground/30" />
							<span className="size-2.5 rounded-full bg-muted-foreground/30" />
							<span className="ml-3 font-mono text-muted-foreground text-xs">
								{t("home.hero.codeCaption")}
							</span>
						</div>
						<pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-foreground/90">
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
				if (match.index > lastIndex) {
					next.push({ value: part.value.slice(lastIndex, match.index) });
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

	tokenize(strings, "text-emerald-300");
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
