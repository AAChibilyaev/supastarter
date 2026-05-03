"use client";

import { cn } from "@repo/ui";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Mock data ────────────────────────────────────────────────────────────────

type UseCaseId = "ecommerce" | "saas" | "docs" | "internal";

interface MockDoc {
	id: string;
	title: string;
	subtitle: string;
	badge?: string;
	tags: string[];
}

interface FacetOption {
	value: string;
	count: number;
}

interface Facet {
	key: string;
	label: string;
	options: FacetOption[];
}

interface ScoreReason {
	label: string;
	score: number;
}

interface UseCaseConfig {
	icon: string;
	label: string;
	placeholder: string;
	chips: string[];
	facets: Facet[];
	docs: MockDoc[];
	typos: Record<string, string>;
	autocomplete: Record<string, string[]>;
	scoreReasons: ScoreReason[];
	aiAnswer?: string;
}

const DEMOS: Record<UseCaseId, UseCaseConfig> = {
	ecommerce: {
		icon: "🛒",
		label: "E-commerce",
		placeholder: 'Try "nike shoes size 42" or "samsnug phone"',
		chips: ["Nike shoes", "iPhone 15", "Samsung", "headphones"],
		facets: [
			{ key: "brand", label: "Brand", options: [{ value: "Nike", count: 12 }, { value: "Adidas", count: 9 }, { value: "Puma", count: 6 }] },
			{ key: "size", label: "Size", options: [{ value: "40", count: 8 }, { value: "42", count: 11 }, { value: "44", count: 7 }] },
		],
		docs: [
			{ id: "1", title: "Nike Air Max 270 — Size 42", subtitle: "$129 · In stock · Free delivery", badge: "Best match", tags: ["nike", "running", "shoes"] },
			{ id: "2", title: "Nike React Infinity — Size 42", subtitle: "$149 · In stock · 2-day shipping", badge: undefined, tags: ["nike", "stability", "shoes"] },
			{ id: "3", title: "Nike ZoomX Vaporfly", subtitle: "$250 · Limited stock · Size 41–43", badge: undefined, tags: ["nike", "carbon", "shoes"] },
			{ id: "4", title: "Adidas Ultraboost 23 — Size 42", subtitle: "$180 · In stock", badge: undefined, tags: ["adidas", "shoes"] },
			{ id: "5", title: "Nike Air Force 1 Low — Size 42", subtitle: "$110 · In stock", badge: undefined, tags: ["nike", "casual", "shoes"] },
			{ id: "6", title: "Samsung Galaxy S24 Ultra", subtitle: "$1,199 · 12GB RAM · Titanium", badge: undefined, tags: ["samsung", "phone"] },
			{ id: "7", title: "iPhone 15 Pro Max — 256GB", subtitle: "$1,099 · Natural Titanium · In stock", badge: undefined, tags: ["iphone", "apple", "phone"] },
			{ id: "8", title: "Sony WH-1000XM5 Headphones", subtitle: "$349 · Noise-cancelling · Wireless", badge: undefined, tags: ["sony", "headphones", "wireless"] },
		],
		typos: { "nikee": "nike", "addidas": "adidas", "samsnug": "samsung", "iphone15": "iphone 15", "headpones": "headphones" },
		autocomplete: {
			"ni": ["Nike shoes size 42", "Nike Air Max", "Nike React Infinity"],
			"ad": ["Adidas Ultraboost", "Adidas Stan Smith", "Adidas NMD"],
			"head": ["headphones wireless", "headphones noise cancelling", "headphones Sony"],
			"ip": ["iPhone 15 Pro", "iPhone 14", "iPad Pro 12.9"],
			"sam": ["Samsung Galaxy S24", "Samsung tablet", "Samsung buds"],
		},
		scoreReasons: [
			{ label: "Exact match in title", score: 40 },
			{ label: "Size filter applied", score: 20 },
			{ label: "In-stock boost", score: 12 },
			{ label: "Brand popularity rank", score: 8 },
		],
	},
	saas: {
		icon: "⚙️",
		label: "SaaS app",
		placeholder: 'Try "user john" or "project alpha"',
		chips: ["user john", "project alpha", "invoice 2024", "settings"],
		facets: [
			{ key: "type", label: "Object type", options: [{ value: "User", count: 5 }, { value: "Project", count: 8 }, { value: "Invoice", count: 12 }] },
			{ key: "status", label: "Status", options: [{ value: "Active", count: 18 }, { value: "Archived", count: 7 }] },
		],
		docs: [
			{ id: "1", title: "John Doe — john@acme.com", subtitle: "User · Admin · Active since Jan 2024", badge: "User", tags: ["user", "admin", "john"] },
			{ id: "2", title: "John Smith — john.smith@acme.com", subtitle: "User · Viewer · Active", badge: "User", tags: ["user", "viewer", "john"] },
			{ id: "3", title: "Project Alpha — Backend migration", subtitle: "Project · In progress · Owner: John D.", badge: "Project", tags: ["project", "alpha", "backend"] },
			{ id: "4", title: "INV-2024-0042 — Acme Corp", subtitle: "Invoice · $4,200 · Paid · Mar 2024", badge: "Invoice", tags: ["invoice", "2024", "paid"] },
			{ id: "5", title: "Invoice template — Monthly SaaS", subtitle: "Document · Last edited 2 days ago", badge: "Doc", tags: ["invoice", "template", "saas"] },
			{ id: "6", title: "Auth settings — SSO configuration", subtitle: "Settings · Security · Updated 4 days ago", badge: "Settings", tags: ["settings", "auth", "sso"] },
		],
		typos: { "usr": "user", "projct": "project", "inovice": "invoice" },
		autocomplete: {
			"us": ["user john", "user settings", "users export"],
			"pr": ["project alpha", "project list", "projects dashboard"],
			"in": ["invoice 2024", "integrations", "invoice settings"],
			"se": ["settings auth", "search index", "security config"],
		},
		scoreReasons: [
			{ label: "Exact match in name field", score: 40 },
			{ label: "Tenant filter (org_id = acme)", score: 30 },
			{ label: "Recent activity boost", score: 10 },
			{ label: "Role filter: admin scoped", score: 5 },
		],
	},
	docs: {
		icon: "📖",
		label: "Documentation",
		placeholder: 'Try "rate limit 429" or "scoped toke"',
		chips: ["getting started", "rate limits", "scoped token", "error 401"],
		facets: [
			{ key: "section", label: "Section", options: [{ value: "Guides", count: 14 }, { value: "API Reference", count: 22 }, { value: "SDK", count: 9 }] },
		],
		docs: [
			{ id: "1", title: "Rate Limiting — HTTP 429 Too Many Requests", subtitle: "API Reference · Quotas & Limits · 3 min read", badge: "API Ref", tags: ["rate", "limit", "429", "quota"] },
			{ id: "2", title: "API Keys & Scoped Tokens — Security Guide", subtitle: "Guides · Security · 5 min read", badge: "Guide", tags: ["api", "key", "scoped", "token", "auth"] },
			{ id: "3", title: "Error Reference — 4xx Responses", subtitle: "API Reference · 401, 403, 429, 422", badge: "API Ref", tags: ["error", "401", "403", "429"] },
			{ id: "4", title: "Quick Start — First Search in 5 Minutes", subtitle: "Guides · Getting Started", badge: "Guide", tags: ["getting", "started", "quickstart"] },
			{ id: "5", title: "JavaScript SDK — v3.1.0 Reference", subtitle: "SDK · npm install @aacsearch/sdk", badge: "SDK", tags: ["sdk", "javascript", "npm"] },
			{ id: "6", title: "Authentication overview — Bearer tokens", subtitle: "Guides · Auth · 4 min read", badge: "Guide", tags: ["auth", "bearer", "token", "401"] },
		],
		typos: { "scoped toke": "scoped token", "autehntication": "authentication", "erro": "error", "ratelimit": "rate limit" },
		autocomplete: {
			"ra": ["rate limits", "rate limit 429", "ranking rules"],
			"sc": ["scoped token", "schema update", "scroll search"],
			"er": ["error 401", "error handling", "error reference"],
			"ge": ["getting started", "geo search", "generic errors"],
		},
		aiAnswer: "Rate limits are enforced per API key. Default is 100 req/s on Pro and 1,000 req/s on Enterprise. When exceeded, the API returns HTTP 429 with a Retry-After header. Use exponential backoff for automatic retry.",
		scoreReasons: [
			{ label: "Exact match 'rate limit' in title", score: 45 },
			{ label: "Semantic match: '429' → rate limit", score: 20 },
			{ label: "Section boost: API Reference", score: 10 },
			{ label: "Page popularity rank", score: 8 },
		],
	},
	internal: {
		icon: "🏢",
		label: "Internal tools",
		placeholder: 'Try "incident auth" or "deploy prod"',
		chips: ["incident auth", "deploy prod", "config redis", "runbook"],
		facets: [
			{ key: "type", label: "Record type", options: [{ value: "Incident", count: 6 }, { value: "Deployment", count: 15 }, { value: "Config", count: 9 }] },
			{ key: "priority", label: "Priority", options: [{ value: "High", count: 4 }, { value: "Medium", count: 14 }] },
		],
		docs: [
			{ id: "1", title: "INC-2024-0089 — Auth service 401 spike", subtitle: "Incident · High · Resolved 18min · May 2024", badge: "Incident", tags: ["incident", "auth", "high", "401"] },
			{ id: "2", title: "DEPLOY-441 — Auth service v2.3.1 → prod", subtitle: "Deployment · Completed · 3 days ago", badge: "Deploy", tags: ["deploy", "prod", "auth"] },
			{ id: "3", title: "AUTH_SECRET_ROTATION — Config", subtitle: "Config · Secrets manager · Changed 7d ago", badge: "Config", tags: ["config", "auth", "secret", "redis"] },
			{ id: "4", title: "INC-2024-0072 — Redis timeout cascade", subtitle: "Incident · Medium · Post-mortem available", badge: "Incident", tags: ["incident", "redis", "timeout"] },
			{ id: "5", title: "Runbook — Auth service recovery steps", subtitle: "Runbook · SRE team · Updated 2024-03", badge: "Runbook", tags: ["runbook", "auth", "sre"] },
			{ id: "6", title: "redis.conf — Production cluster config", subtitle: "Config · Infrastructure · maxmemory 32gb", badge: "Config", tags: ["config", "redis", "prod"] },
		],
		typos: { "authntication": "authentication", "inccident": "incident", "deploi": "deploy", "confg": "config" },
		autocomplete: {
			"inc": ["incident auth", "incident redis", "incidents 2024"],
			"dep": ["deploy prod", "deploy staging", "deployment history"],
			"con": ["config redis", "config auth", "config update"],
			"run": ["runbook auth", "runbook deploy", "runbook redis"],
		},
		scoreReasons: [
			{ label: "Exact match in title", score: 45 },
			{ label: "Tag match: 'auth'", score: 20 },
			{ label: "Recency boost (resolved recently)", score: 10 },
			{ label: "Priority boost: High", score: 8 },
		],
	},
};

const USE_CASE_ORDER: UseCaseId[] = ["ecommerce", "saas", "docs", "internal"];

// ─── Utilities ────────────────────────────────────────────────────────────────

function highlight(text: string, query: string): string {
	if (!query.trim()) return text;
	const term = query.trim().toLowerCase();
	const idx = text.toLowerCase().indexOf(term);
	if (idx === -1) return text;
	return (
		text.slice(0, idx) +
		`<mark class="bg-primary/20 text-foreground rounded-sm px-0.5">${text.slice(idx, idx + term.length)}</mark>` +
		text.slice(idx + term.length)
	);
}

function filterDocs(docs: MockDoc[], query: string): MockDoc[] {
	if (!query.trim()) return docs.slice(0, 5);
	const q = query.toLowerCase();
	const result = docs.filter(
		(d) =>
			d.title.toLowerCase().includes(q) ||
			d.subtitle.toLowerCase().includes(q) ||
			d.tags.some((t) => t.toLowerCase().includes(q)),
	);
	return result.length > 0 ? result.slice(0, 5) : [];
}

function detectTypo(typos: Record<string, string>, query: string): string | null {
	const q = query.toLowerCase().trim();
	for (const [typo, correction] of Object.entries(typos)) {
		if (q.includes(typo)) return correction;
	}
	return null;
}

function getAutocomplete(autocomplete: Record<string, string[]>, query: string): string[] {
	if (query.length < 2) return [];
	const q = query.toLowerCase();
	for (const [prefix, suggestions] of Object.entries(autocomplete)) {
		if (q.startsWith(prefix) || prefix.startsWith(q.slice(0, 3))) return suggestions;
	}
	return [];
}

const BADGE_ICONS: Record<string, string> = {
	"Best match": "⭐", User: "👤", Project: "📁", Invoice: "📄", Doc: "📝", Settings: "⚙️",
	"API Ref": "📡", Guide: "📖", SDK: "🔧", Incident: "🚨", Deploy: "🚀", Config: "⚙️", Runbook: "📋",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function LiveDemoSection() {
	const t = useTranslations("homeLiveDemo");
	const [activeCase, setActiveCase] = useState<UseCaseId>("ecommerce");
	const [query, setQuery] = useState("");
	const [showAC, setShowAC] = useState(false);
	const [showWhy, setShowWhy] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const acRef = useRef<HTMLDivElement>(null);

	const demo = DEMOS[activeCase];
	const typoCorrection = query.length > 2 ? detectTypo(demo.typos, query) : null;
	const acSuggestions = getAutocomplete(demo.autocomplete, query);
	const effectiveQuery = typoCorrection ?? query;
	const results = filterDocs(demo.docs, effectiveQuery);

	useEffect(() => {
		setQuery("");
		setShowAC(false);
		setShowWhy(null);
	}, [activeCase]);

	const applyChip = useCallback((chip: string) => {
		setQuery(chip);
		setShowAC(false);
		inputRef.current?.focus();
	}, []);

	useEffect(() => {
		function onOut(e: MouseEvent) {
			if (!acRef.current?.contains(e.target as Node) && e.target !== inputRef.current) {
				setShowAC(false);
			}
		}
		document.addEventListener("mousedown", onOut);
		return () => document.removeEventListener("mousedown", onOut);
	}, []);

	return (
		<section className="section-padding border-b border-border bg-muted/10">
			<div className="container">
				{/* Header */}
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						{t("title")}
					</h2>
					<p className="mt-4 text-lg font-light text-balance text-muted-foreground">
						{t("subtitle")}
					</p>
				</div>

				{/* Use-case tabs */}
				<div className="mt-8 flex justify-center">
					<div className="gap-1 p-1 flex flex-wrap items-center rounded-xl border border-border bg-muted">
						{USE_CASE_ORDER.map((id) => (
							<button
								key={id}
								type="button"
								onClick={() => setActiveCase(id)}
								className={cn(
									"px-3 py-1.5 text-sm rounded-lg transition-all duration-150 font-light",
									activeCase === id
										? "bg-card shadow-sm text-foreground"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								<span className="mr-1.5">{DEMOS[id].icon}</span>
								{DEMOS[id].label}
							</button>
						))}
					</div>
				</div>

				{/* Demo shell */}
				<div className="mt-8 max-w-3xl mx-auto overflow-visible rounded-xl border border-border bg-card shadow-sm">
					{/* Search bar + autocomplete */}
					<div className="relative">
						<div className="gap-3 px-4 py-3 flex items-center border-b border-border bg-muted/20">
							<svg className="size-4 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
								<path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
							</svg>
							<input
								ref={inputRef}
								type="text"
								value={query}
								placeholder={demo.placeholder}
								onChange={(e) => {
									setQuery(e.target.value);
									setShowAC(e.target.value.length > 1);
									setShowWhy(null);
								}}
								onFocus={() => query.length > 1 && setShowAC(true)}
								className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
							/>
							{query && (
								<button
									type="button"
									onClick={() => { setQuery(""); setShowAC(false); setShowWhy(null); }}
									className="text-xs text-muted-foreground/60 hover:text-muted-foreground"
									aria-label="Clear"
								>
									✕
								</button>
							)}
						</div>

						{showAC && acSuggestions.length > 0 && (
							<div ref={acRef} className="absolute z-20 left-0 right-0 top-full border border-border border-t-0 bg-card shadow-lg rounded-b-xl overflow-hidden">
								{acSuggestions.map((s) => (
									<button
										key={s}
										type="button"
										className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-muted transition-colors"
										onMouseDown={() => applyChip(s)}
									>
										<svg className="size-3.5 shrink-0 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
											<path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
										</svg>
										<span className="text-foreground">{s}</span>
									</button>
								))}
							</div>
						)}
					</div>

					{/* Chips */}
					<div className="gap-2 px-4 py-2.5 flex flex-wrap border-b border-border">
						{demo.chips.map((chip) => (
							<button
								key={chip}
								type="button"
								onClick={() => applyChip(chip)}
								className={cn(
									"px-2.5 py-1 text-xs rounded-md border transition-all",
									query === chip
										? "bg-primary/10 border-primary/30 text-primary"
										: "border-border bg-muted/50 text-muted-foreground hover:border-primary/30 hover:text-foreground",
								)}
							>
								{chip}
							</button>
						))}
					</div>

					{/* Results area */}
					<div className="flex flex-col sm:flex-row min-h-[260px]">
						{/* Facets */}
						<div className="border-b sm:border-b-0 sm:border-r border-border p-4 w-full sm:w-40 shrink-0 space-y-4">
							{demo.facets.slice(0, 2).map((facet) => (
								<div key={facet.key}>
									<p className="text-[11px] font-medium text-foreground/60 uppercase tracking-wide mb-2">{facet.label}</p>
									<div className="space-y-1.5">
										{facet.options.slice(0, 3).map((opt) => (
											<label key={opt.value} className="flex items-center justify-between cursor-pointer group">
												<div className="flex items-center gap-1.5">
													<input type="checkbox" className="size-3 rounded accent-primary" readOnly />
													<span className="text-xs font-light text-muted-foreground group-hover:text-foreground transition-colors">{opt.value}</span>
												</div>
												<span className="text-[10px] text-muted-foreground/40">{opt.count}</span>
											</label>
										))}
									</div>
								</div>
							))}
						</div>

						{/* Results */}
						<div className="flex-1 p-4">
							{/* Typo banner */}
							{typoCorrection && query && (
								<div className="mb-3 px-3 py-2 text-xs rounded-lg bg-muted border border-border text-muted-foreground flex items-center gap-2">
									<span>{t("didYouMean")}</span>
									<button type="button" className="font-semibold underline underline-offset-2" onClick={() => applyChip(typoCorrection)}>{typoCorrection}</button>
									<span className="ml-auto opacity-50 text-[10px]">typo tolerance</span>
								</div>
							)}

							{/* AI answer */}
							{activeCase === "docs" && query && demo.aiAnswer && (
								<div className="mb-3 px-3 py-2.5 rounded-lg border border-primary/20 bg-primary/5">
									<p className="text-[10px] font-medium text-primary mb-1">AI answer · cited from docs</p>
									<p className="text-xs font-light text-foreground leading-relaxed line-clamp-3">{demo.aiAnswer}</p>
								</div>
							)}

							{/* Stats */}
							{query && results.length > 0 && (
								<p className="text-[10px] font-light text-muted-foreground/50 mb-2">
									{results.length} results · {14 + (query.length % 9)}ms
								</p>
							)}

							{results.length > 0 ? (
								<div className="space-y-0.5">
									{results.map((doc) => (
										<div key={doc.id} className="group relative flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-default">
											<div className="size-7 shrink-0 rounded bg-muted flex items-center justify-center text-sm mt-0.5">
												{BADGE_ICONS[doc.badge ?? "Doc"] ?? "📝"}
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 flex-wrap">
													<p
														className="text-sm font-light text-foreground leading-tight"
														dangerouslySetInnerHTML={{ __html: highlight(doc.title, effectiveQuery) }}
													/>
													{doc.badge && doc.badge !== "Best match" && (
														<span className="shrink-0 px-1.5 py-0.5 text-[10px] rounded border border-border bg-muted text-muted-foreground">
															{doc.badge}
														</span>
													)}
													{doc.badge === "Best match" && (
														<span className="shrink-0 px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary border border-primary/20">
															best match
														</span>
													)}
												</div>
												<p className="mt-0.5 text-xs font-light text-muted-foreground">{doc.subtitle}</p>
											</div>

											<button
												type="button"
												className="shrink-0 self-center opacity-0 group-hover:opacity-100 px-2 py-1 text-[10px] rounded border border-border bg-card text-muted-foreground hover:text-foreground transition-all whitespace-nowrap"
												onClick={() => setShowWhy(showWhy === doc.id ? null : doc.id)}
											>
												{t("whyResult")}
											</button>

											{showWhy === doc.id && (
												<div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-border bg-card shadow-xl p-3">
													<p className="text-[10px] font-semibold text-foreground mb-2 uppercase tracking-wide">Relevance score</p>
													{demo.scoreReasons.map((r) => (
														<div key={r.label} className="flex items-center justify-between py-0.5">
															<span className="text-[10px] font-light text-muted-foreground">{r.label}</span>
															<span className="text-[10px] font-semibold text-primary ml-3">+{r.score}</span>
														</div>
													))}
												</div>
											)}
										</div>
									))}
								</div>
							) : (
								<div className="py-10 text-center">
									<p className="text-sm font-light text-muted-foreground">{t("noResults")}</p>
									<div className="mt-3 flex flex-wrap gap-2 justify-center">
										{demo.chips.slice(0, 3).map((chip) => (
											<button
												key={chip}
												type="button"
												onClick={() => applyChip(chip)}
												className="px-3 py-1 text-xs rounded-md border border-border hover:bg-muted transition-colors text-muted-foreground"
											>
												{chip}
											</button>
										))}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>

				<p className="mt-5 text-center text-sm text-muted-foreground">
					<a href="/demo" className="font-medium text-primary underline-offset-4 hover:underline">
						{t("openPlayground")} →
					</a>
				</p>
			</div>
		</section>
	);
}
