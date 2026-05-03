"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib";
import {
	CameraIcon,
	CheckIcon,
	ChevronRightIcon,
	ImageIcon,
	MessageSquareIcon,
	MicIcon,
	SearchIcon,
	SparklesIcon,
	XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type PlaygroundTab = "text" | "voice" | "photo" | "image" | "chat";

interface TabConfig {
	key: PlaygroundTab;
	icon: typeof SearchIcon;
}

const tabs: TabConfig[] = [
	{ key: "text", icon: SearchIcon },
	{ key: "voice", icon: MicIcon },
	{ key: "photo", icon: CameraIcon },
	{ key: "image", icon: ImageIcon },
	{ key: "chat", icon: MessageSquareIcon },
];

const textDemo = {
	query: "crosovki nike 42",
	correction: "crossovki nike 42",
	results: [
		{ title: "Nike Air Max 90", price: "$129", brand: "Nike", size: "42", inStock: true },
		{ title: "Nike Revolution 7", price: "$89", brand: "Nike", size: "42", inStock: true },
		{ title: "Nike Pegasus 41", price: "$149", brand: "Nike", size: "42", inStock: false },
	],
};

const voiceDemo = {
	transcript: "find red nike sneakers up to ten thousand",
	parsed: {
		query: "Nike sneakers",
		filters: { color: "red", price: "<10000" },
	},
};

const photoDemo = {
	detected: ["sneaker", "white", "Nike-like", "low-top"],
	results: [
		{ title: "Nike Court Vision Low", price: "$94", match: "92%" },
		{ title: "Air Jordan 1 Low", price: "$119", match: "87%" },
		{ title: "Nike Dunk Low Retro", price: "$109", match: "84%" },
	],
};

const imageDemo = {
	similarTo: "UI dashboard screenshot",
	results: [
		{ title: "Analytics Dashboard Template", category: "UI Design", match: "94%" },
		{ title: "SaaS Admin Panel", category: "UI Design", match: "88%" },
		{ title: "Search Analytics View", category: "Docs", match: "82%" },
	],
};

const chatDemo = {
	question: "How to configure scoped token for a tenant?",
	answer: "Use the createScopedToken() API with the organizationId claim. Set allowedActions to restrict endpoints.",
	sources: [
		{ label: "Security → Scoped tokens", href: "#" },
		{ label: "API reference → createToken()", href: "#" },
	],
	followUp: ["Show code example", "Open API keys", "Check origin allow-list"],
};

export function MultimodalSearchPlayground() {
	const t = useTranslations();
	const [activeTab, setActiveTab] = useState<PlaygroundTab>("text");

	return (
		<section className="section-padding border-b border-border bg-muted/30">
			<div className="container">
				<div className="max-w-3xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						{t("homeMultimodalPlayground.title")}
					</h2>
					<p className="mt-4 text-lg font-light text-balance text-muted-foreground">
						{t("homeMultimodalPlayground.subtitle")}
					</p>
				</div>

				<div className="mt-10 max-w-3xl mx-auto">
					{/* Tabs */}
					<div className="gap-1 flex justify-center">
						{tabs.map(({ key, icon: Icon }) => (
							<button
								key={key}
								onClick={() => setActiveTab(key)}
								className={cn(
									"gap-2 px-4 py-2 text-sm font-medium inline-flex items-center rounded-md transition-colors",
									activeTab === key
										? "bg-foreground text-background"
										: "text-muted-foreground hover:bg-muted hover:text-foreground",
								)}
							>
								<Icon className="size-4" />
								{key === "text" && "Text Search"}
								{key === "voice" && "Voice Search"}
								{key === "photo" && "Photo Search"}
								{key === "image" && "Image Search"}
								{key === "chat" && "AI Voice Chat"}
							</button>
						))}
					</div>

					{/* Demo panel */}
					<div className="mt-6 shadow-sm overflow-hidden rounded-lg border border-border bg-card">
						{activeTab === "text" && <TextDemo />}
						{activeTab === "voice" && <VoiceDemo />}
						{activeTab === "photo" && <PhotoDemo />}
						{activeTab === "image" && <ImageDemo />}
						{activeTab === "chat" && <ChatDemo />}
					</div>

					{/* Input mode label */}
					<p className="mt-4 text-xs font-light text-center text-muted-foreground">
						One search engine.{" "}
						<span className="font-medium text-foreground">Five input modes.</span>
					</p>
				</div>
			</div>
		</section>
	);
}

function TextDemo() {
	return (
		<div className="p-5 md:p-8">
			<div className="gap-2 px-3 py-2 flex items-center rounded-md border border-border bg-background">
				<SearchIcon className="size-4 shrink-0 text-muted-foreground" />
				<span className="text-sm flex-1">{textDemo.query}</span>
				<Badge status="info" className="text-xs normal-case">
					Typo corrected
				</Badge>
			</div>

			<div className="mt-2 px-3 py-1.5 text-xs font-light text-muted-foreground">
				→ <span className="font-mono text-foreground/80">{textDemo.correction}</span>
			</div>

			<div className="mt-4 gap-3 grid">
				{textDemo.results.map((r) => (
					<div
						key={r.title}
						className={cn(
							"gap-3 px-4 py-3 flex items-center rounded-md border transition-colors",
							r.inStock
								? "border-border bg-background"
								: "border-border/50 bg-muted/50 opacity-60",
						)}
					>
						<div className="size-10 flex shrink-0 items-center justify-center rounded-md bg-muted">
							<SearchIcon className="size-4 text-muted-foreground" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="text-sm font-medium text-foreground">{r.title}</div>
							<div className="text-xs font-light text-muted-foreground">
								{r.brand} · Size {r.size} · {r.price}
							</div>
						</div>
						{!r.inStock && (
							<Badge status="warning" className="text-xs shrink-0 normal-case">
								Out of stock
							</Badge>
						)}
						{r.inStock && (
							<Badge status="success" className="text-xs shrink-0 normal-case">
								In stock
							</Badge>
						)}
					</div>
				))}
			</div>

			{/* Facets */}
			<div className="mt-4 gap-2 flex flex-wrap">
				{["Nike", "Size: 42", "In Stock", "Price: $50–$200"].map((facet) => (
					<Badge
						key={facet}
						className="gap-1 px-2.5 py-1 text-xs font-light cursor-pointer border-border bg-secondary text-muted-foreground normal-case"
					>
						{facet}
						<XIcon className="size-3" />
					</Badge>
				))}
			</div>
		</div>
	);
}

function VoiceDemo() {
	const [listening, setListening] = useState(false);

	return (
		<div className="p-5 md:p-8">
			<div className="flex flex-col items-center text-center">
				<button
					onClick={() => setListening(!listening)}
					className={cn(
						"size-16 flex items-center justify-center rounded-full transition-all",
						listening
							? "shadow-lg scale-110 bg-foreground/5"
							: "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
					)}
				>
					<MicIcon
						className={cn("size-7", listening && "animate-pulse text-muted-foreground")}
					/>
				</button>

				{listening ? (
					<div className="mt-4">
						<div className="gap-1.5 flex items-center justify-center">
							<span className="size-2 animate-pulse rounded-full bg-foreground/60" />
							<span className="text-sm font-light text-muted-foreground">
								Listening...
							</span>
						</div>
						<div className="mt-4 gap-1 flex items-center justify-center">
							{[1, 2, 3, 4, 5, 4, 3, 2].map((h, i) => (
								<div
									key={i}
									className="w-1 rounded-full bg-foreground/30 transition-all"
									style={{ height: `${h * 4}px` }}
								/>
							))}
						</div>
					</div>
				) : (
					<p className="mt-4 text-sm font-light text-muted-foreground">
						Tap to start speaking
					</p>
				)}
			</div>

			{!listening && (
				<>
					{/* Transcript */}
					<div className="mt-6 p-4 rounded-md border border-border bg-background">
						<div className="text-xs font-light text-muted-foreground">Transcript</div>
						<p className="mt-1 text-sm text-foreground">{voiceDemo.transcript}</p>
					</div>

					{/* Parsed */}
					<div className="mt-3 p-4 rounded-md border border-border bg-background">
						<div className="text-xs font-light text-muted-foreground">Parsed query</div>
						<div className="mt-1 text-sm text-foreground">
							query = <span className="font-mono">{voiceDemo.parsed.query}</span>
						</div>
						<div className="mt-1 text-sm text-foreground">
							filters ={" "}
							<span className="font-mono">
								{JSON.stringify(voiceDemo.parsed.filters)}
							</span>
						</div>
					</div>
				</>
			)}
		</div>
	);
}

function PhotoDemo() {
	const [uploaded, setUploaded] = useState(false);

	return (
		<div className="p-5 md:p-8">
			{!uploaded ? (
				<div className="flex flex-col items-center text-center">
					<div className="size-24 flex items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/50">
						<CameraIcon className="size-6 text-muted-foreground" />
					</div>
					<Button
						onClick={() => setUploaded(true)}
						variant="secondary"
						size="sm"
						className="mt-4"
					>
						Upload demo photo
					</Button>
					<p className="mt-2 text-xs font-light text-muted-foreground">
						Tap to simulate a photo upload
					</p>
				</div>
			) : (
				<>
					<div className="gap-3 flex items-start">
						<div className="size-16 flex shrink-0 items-center justify-center rounded-md border bg-gradient-to-br from-muted to-muted/50">
							<CameraIcon className="size-6 text-muted-foreground" />
						</div>
						<div className="flex-1">
							<div className="text-xs font-light text-muted-foreground">
								Detected attributes
							</div>
							<div className="mt-1.5 gap-1.5 flex flex-wrap">
								{photoDemo.detected.map((d) => (
									<Badge
										key={d}
										className="text-xs border-border bg-secondary text-muted-foreground normal-case"
									>
										{d}
									</Badge>
								))}
							</div>
						</div>
					</div>

					<div className="mt-5 gap-3 grid">
						{photoDemo.results.map((r) => (
							<div
								key={r.title}
								className="gap-3 px-4 py-3 flex items-center rounded-md border border-border bg-background"
							>
								<div className="size-10 flex shrink-0 items-center justify-center rounded-md bg-muted">
									<SearchIcon className="size-4 text-muted-foreground" />
								</div>
								<div className="min-w-0 flex-1">
									<div className="text-sm font-medium text-foreground">
										{r.title}
									</div>
									<div className="text-xs font-light text-muted-foreground">
										{r.price}
									</div>
								</div>
								<span className="text-xs font-medium text-foreground/60">
									{r.match}
								</span>
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
}

function ImageDemo() {
	return (
		<div className="p-5 md:p-8">
			<div className="gap-3 flex items-start">
				<div className="size-16 flex shrink-0 items-center justify-center rounded-md border bg-gradient-to-br from-muted to-muted/50">
					<ImageIcon className="size-6 text-muted-foreground" />
				</div>
				<div className="flex-1">
					<div className="text-xs font-light text-muted-foreground">Reference image</div>
					<p className="mt-0.5 text-sm font-medium text-foreground">
						{imageDemo.similarTo}
					</p>
				</div>
			</div>

			<div className="mt-6 gap-3 grid">
				{imageDemo.results.map((r) => (
					<div
						key={r.title}
						className="gap-3 px-4 py-3 flex items-center rounded-md border border-border bg-background"
					>
						<div className="size-10 flex shrink-0 items-center justify-center rounded-md bg-muted">
							<ImageIcon className="size-4 text-muted-foreground" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="text-sm font-medium text-foreground">{r.title}</div>
							<div className="text-xs font-light text-muted-foreground">
								{r.category}
							</div>
						</div>
						<span className="text-xs font-medium text-muted-foreground">{r.match}</span>
					</div>
				))}
			</div>

			<div className="mt-4 gap-2 flex flex-wrap">
				<Button size="sm" variant="secondary" className="text-xs">
					<CheckIcon className="mr-1 size-3" />
					Similar
				</Button>
				<Button size="sm" variant="ghost" className="text-xs">
					Same color
				</Button>
				<Button size="sm" variant="ghost" className="text-xs">
					Same category
				</Button>
			</div>
		</div>
	);
}

function ChatDemo() {
	const [answered, setAnswered] = useState(false);

	return (
		<div className="p-5 md:p-8">
			{!answered ? (
				<div className="flex flex-col items-center text-center">
					<div className="size-12 flex items-center justify-center rounded-md bg-secondary">
						<MessageSquareIcon className="size-6 text-foreground/60" />
					</div>
					<Button
						onClick={() => setAnswered(true)}
						variant="default"
						size="md"
						className="mt-4"
					>
						Ask: {chatDemo.question}
					</Button>
					<p className="mt-2 text-xs font-light text-muted-foreground">
						AI answers with citations — never hallucinated
					</p>
				</div>
			) : (
				<>
					<div className="p-4 rounded-md border border-border bg-secondary">
						<div className="gap-3 flex items-start">
							<SparklesIcon className="size-4 mt-0.5 shrink-0 text-foreground/50" />
							<p className="text-sm leading-relaxed text-foreground">
								{chatDemo.answer}
							</p>
						</div>
					</div>

					<div className="mt-4">
						<div className="text-xs font-light mb-2 text-muted-foreground">Sources</div>
						<div className="gap-2 grid">
							{chatDemo.sources.map((s) => (
								<a
									key={s.label}
									href={s.href}
									className="gap-2 px-3 py-2 text-sm inline-flex items-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
								>
									<ChevronRightIcon className="size-3 text-foreground/40" />
									{s.label}
								</a>
							))}
						</div>
					</div>

					<div className="mt-4">
						<div className="text-xs font-light mb-2 text-muted-foreground">
							Follow up
						</div>
						<div className="gap-2 flex flex-wrap">
							{chatDemo.followUp.map((f) => (
								<Button key={f} size="sm" variant="secondary" className="text-xs">
									{f}
								</Button>
							))}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
