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
			<div className="inset-0 absolute -z-10 bg-[radial-gradient(circle_at_30%_20%,oklch(0.45_0_0/0.10),transparent_55%)]" />
			<div className="inset-0 absolute -z-10 bg-[radial-gradient(circle_at_85%_80%,oklch(0.45_0_0/0.06),transparent_50%)]" />
			<div className="gap-10 py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-24 container grid">
				<div className="flex flex-col justify-center">
					<div className="mb-5 gap-2 px-3 py-1 text-xs backdrop-blur inline-flex w-fit items-center rounded-none border border-border bg-card/40 text-muted-foreground">
						<span className="size-1.5 bg-pink-500 rounded-full" />
						{t("home.hero.badge")}
					</div>

					<h1 className="font-medium text-4xl tracking-tight md:text-5xl lg:text-6xl text-balance text-foreground">
						{t("home.hero.title")}
					</h1>

					<p className="mt-5 max-w-xl text-base md:text-lg text-pretty text-muted-foreground">
						{t("home.hero.subtitle")}
					</p>

					<div className="mt-8 gap-3 flex flex-wrap items-center">
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
					<div className="shadow-2xl shadow-black/10 backdrop-blur dark:shadow-black/30 relative overflow-hidden rounded-sm border border-border/80 bg-card/50">
						<div className="gap-2 px-4 py-3 flex items-center border-b border-border/60">
							<span className="size-2.5 rounded-full bg-muted-foreground/30" />
							<span className="size-2.5 rounded-full bg-muted-foreground/30" />
							<span className="size-2.5 rounded-full bg-muted-foreground/30" />
							<span className="ml-3 text-xs text-muted-foreground">
								{t("home.hero.codeCaption")}
							</span>
						</div>
						<pre className="p-5 font-mono leading-relaxed overflow-x-auto text-[13px] text-foreground/90">
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
