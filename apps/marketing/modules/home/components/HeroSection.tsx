"use client";

import { config } from "@config";
import { Button } from "@repo/ui/components/button";
import {
	ArrowRightIcon,
	BarChart3Icon,
	CameraIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	ImageIcon,
	KeyboardIcon,
	MessageSquareIcon,
	MicIcon,
	Minimize2Icon,
	SearchIcon,
	ShieldIcon,
	SparklesIcon,
	ZapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { CommandMenu } from "./CommandMenu";

type SearchMode = "text" | "voice" | "photo" | "image" | "chat";

interface ModeOption {
	key: SearchMode;
	icon: typeof KeyboardIcon;
}

const MODES: ModeOption[] = [
	{ key: "text", icon: KeyboardIcon },
	{ key: "voice", icon: MicIcon },
	{ key: "photo", icon: CameraIcon },
	{ key: "image", icon: ImageIcon },
	{ key: "chat", icon: MessageSquareIcon },
];

const CHIPS = [
	"sneakers like this photo",
	"find error 401",
	"show similar products",
	"what changed in billing?",
	"find this by screenshot",
];

const MODE_STATS = [
	{ value: "2.5M+", labelKey: "hero.statDocs" },
	{ value: "< 50ms", labelKey: "hero.statLatency" },
	{ value: "99.99%", labelKey: "hero.statUptime" },
];

const WIDGET_STORAGE_KEY = "aacsearch-hero-widget";

export function HeroSection() {
	const t = useTranslations("home");
	const [mode, setMode] = useState<SearchMode>("text");
	const [cmdOpen, setCmdOpen] = useState(false);
	const [widgetMode, setWidgetMode] = useState(false);

	// Restore widget preference from localStorage
	useEffect(() => {
		const stored = localStorage.getItem(WIDGET_STORAGE_KEY);
		if (stored === "true") {
			setWidgetMode(true);
		}
	}, []);

	// Persist widget preference
	useEffect(() => {
		localStorage.setItem(WIDGET_STORAGE_KEY, String(widgetMode));
	}, [widgetMode]);

	// Global Cmd+K / Ctrl+K listener
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setCmdOpen(true);
				// Auto-switch to full mode when opening command menu
				setWidgetMode(false);
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, []);

	const getPlaceholder = () => {
		switch (mode) {
			case "text":
				return t("hero.searchPlaceholder");
			case "voice":
				return t("hero.voicePlaceholder");
			case "photo":
			case "image":
				return t("hero.mediaPlaceholder");
			case "chat":
				return t("hero.chatPlaceholder");
		}
	};

	const modeActiveColors: Record<SearchMode, string> = {
		text: "text-foreground",
		voice: "text-cyan-500 dark:text-cyan-400",
		photo: "text-purple-500 dark:text-purple-400",
		image: "text-amber-500 dark:text-amber-400",
		chat: "text-green-500 dark:text-green-400",
	};

	// Widget mode — compact floating bar
	if (widgetMode) {
		return (
			<>
				<CommandMenu open={cmdOpen} onOpenChange={setCmdOpen} onModeSelect={(m) => { setMode(m); setCmdOpen(true); }} />

				<div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
					<div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 shadow-lg shadow-black/5 backdrop-blur-xl transition-all hover:shadow-xl hover:shadow-black/10">
						<SearchIcon className="size-4 shrink-0 text-muted-foreground" />
						<button
							type="button"
							onClick={() => {
								setWidgetMode(false);
								setCmdOpen(true);
							}}
							className="flex-1 bg-transparent px-2 text-sm font-light text-muted-foreground outline-none transition-colors hover:text-foreground"
						>
							{t("hero.searchPlaceholder")}
						</button>
						<div className="flex items-center gap-1">
							{MODES.map(({ key, icon: Icon }) => (
								<button
									key={key}
									type="button"
									onClick={() => { setMode(key); setCmdOpen(true); }}
									className={`flex size-7 items-center justify-center rounded-md transition-colors ${
										mode === key
											? `${modeActiveColors[key]} bg-muted/60`
											: "text-muted-foreground/60 hover:text-muted-foreground"
									}`}
									aria-label={`Search by ${key}`}
								>
									<Icon className="size-3.5" />
								</button>
							))}
						</div>
						<span className="ml-1 hidden rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
							⌘K
						</span>
						<button
							type="button"
							onClick={() => setWidgetMode(false)}
							className="ml-1 flex size-6 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:text-muted-foreground"
							aria-label="Expand search"
						>
							<ChevronUpIcon className="size-3.5" />
						</button>
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<CommandMenu open={cmdOpen} onOpenChange={setCmdOpen} onModeSelect={(m) => { setMode(m); setCmdOpen(true); }} />

			<section className="relative overflow-hidden bg-background">
				<div className="section-padding relative z-10 container">
					{/* Hero heading */}
					<div className="mx-auto max-w-3xl text-center">
						<h1 className="text-4xl font-light tracking-tight text-balance md:text-5xl lg:text-6xl text-foreground">
							{t("hero.title")}
						</h1>
						<p className="mt-6 max-w-2xl text-base sm:text-lg font-light mx-auto text-balance text-muted-foreground">
							{t("hero.subtitle")}
						</p>
					</div>

					{/* Multimodal search bar — opens CommandMenu on click/focus */}
					<div className="mx-auto mt-10 max-w-2xl">
						<div
							className="cursor-pointer rounded-xl border border-border bg-card shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background hover:shadow-md"
							role="button"
							tabIndex={0}
							onClick={() => setCmdOpen(true)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									setCmdOpen(true);
								}
							}}
							aria-label="Open search command menu"
						>
							<div className="flex h-12 items-center gap-3 px-4">
								<SearchIcon className="size-4 shrink-0 text-muted-foreground" />
								<span className="flex-1 text-left text-sm font-light text-muted-foreground/60">
									{getPlaceholder()}
								</span>
								<div className="flex items-center gap-0.5">
									{MODES.map(({ key, icon: Icon }) => (
										<button
											key={key}
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												setMode(key);
												setCmdOpen(true);
											}}
											className={`flex size-8 items-center justify-center rounded-md transition-colors ${
												mode === key
													? `${modeActiveColors[key]} bg-muted`
													: "text-muted-foreground hover:text-foreground"
											}`}
											aria-label={`Search by ${key}`}
										>
											<Icon className="size-4" />
										</button>
									))}
								</div>
								<span className="hidden shrink-0 items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
									<KeyboardIcon className="size-3" />
									<span>K</span>
								</span>
							</div>
						</div>

						{/* Chips */}
						<div className="mt-4 gap-2 flex flex-wrap items-center justify-center">
							{CHIPS.map((chip) => (
								<button
									key={chip}
									type="button"
									onClick={() => setCmdOpen(true)}
									className="inline-flex cursor-pointer items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-light text-muted-foreground transition-colors hover:border-muted-foreground/30 hover:text-foreground"
								>
									{chip}
								</button>
							))}
						</div>
					</div>

					{/* CTA buttons */}
					<div className="mt-8 gap-3 flex w-full items-center justify-center">
						<Button className="shrink-0" size="lg" variant="primary" asChild>
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
						<span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-light text-primary">
							<ZapIcon className="size-3" />
							{t("hero.badgeLatency")}
						</span>
						<span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-light text-primary">
							<ShieldIcon className="size-3" />
							{t("hero.badgeSoc2")}
						</span>
						<span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-light text-primary">
							<SearchIcon className="size-3" />
							{t("hero.badgeFulltext")}
						</span>
						<span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-light text-primary">
							<BarChart3Icon className="size-3" />
							{t("hero.badgeAnalytics")}
						</span>
					</div>

					{/* Stats row */}
					<div className="mt-12 max-w-2xl gap-4 sm:gap-8 mx-auto grid grid-cols-3">
						{MODE_STATS.map((stat) => (
							<div key={stat.labelKey} className="text-center">
								<div className="text-2xl font-bold sm:text-3xl text-foreground tabular-nums">
									{stat.value}
								</div>
								<div className="mt-1 text-xs sm:text-sm font-light text-muted-foreground">
									{t(stat.labelKey)}
								</div>
							</div>
						))}
					</div>

					{/* Widget mode toggle */}
					<div className="mt-8 flex items-center justify-center">
						<button
							type="button"
							onClick={() => setWidgetMode(true)}
							className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-light text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
						>
							<Minimize2Icon className="size-3" />
							<span>Compact widget</span>
						</button>
					</div>
				</div>
			</section>
		</>
	);
}
