"use client";

import { config } from "@config";
import { Button } from "@repo/ui/components/button";
import {
	ArrowRightIcon,
	BarChart3Icon,
	CameraIcon,
	ImageIcon,
	KeyboardIcon,
	MessageSquareIcon,
	MicIcon,
	SearchIcon,
	ShieldIcon,
	SparklesIcon,
	ZapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
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
	const [isHovered, setIsHovered] = useState(false);
	const searchRef = useRef<HTMLDivElement>(null);

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

	const openCmdForMode = useCallback((m: SearchMode) => {
		setMode(m);
		setCmdOpen(true);
	}, []);

	// ─── AI Assistant Widget Mode ──────────────────────────
	if (widgetMode) {
		return (
			<>
				<CommandMenu
					open={cmdOpen}
					onOpenChange={setCmdOpen}
					onModeSelect={openCmdForMode}
				/>

				<div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 sm:bottom-8">
					<div
						className="group relative flex items-center gap-3 rounded-2xl border border-border/60 bg-card/90 px-5 py-3 shadow-lg shadow-black/5 backdrop-blur-xl transition-all duration-300 hover:border-border hover:shadow-xl hover:shadow-black/10 sm:px-6 sm:py-3.5"
						onMouseEnter={() => setIsHovered(true)}
						onMouseLeave={() => setIsHovered(false)}
					>
						{/* Animated gradient orb */}
						<div className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 sm:size-9">
							<SparklesIcon className="size-4 text-primary sm:size-4.5" />
							<span className="absolute inset-0 animate-pulse rounded-full bg-primary/5" />
						</div>

						{/* Prompt */}
						<button
							type="button"
							onClick={() => {
								setWidgetMode(false);
								setCmdOpen(true);
							}}
							className="flex-1 bg-transparent text-left text-sm font-light text-muted-foreground/70 outline-none transition-colors hover:text-muted-foreground"
						>
							{t("hero.searchPlaceholder")}
						</button>

						{/* Mode icons — invisible by default, appear on group hover */}
						<div
							className={`flex items-center gap-0.5 transition-all duration-300 ${
								isHovered
									? "w-auto opacity-100"
									: "w-0 overflow-hidden opacity-0"
							}`}
						>
							{MODES.map(({ key, icon: Icon }) => (
								<button
									key={key}
									type="button"
									onClick={() => openCmdForMode(key)}
									className={`flex size-7 items-center justify-center rounded-md transition-colors ${
										mode === key
											? `${modeActiveColors[key]} bg-muted/60`
											: "text-muted-foreground/50 hover:text-muted-foreground"
									}`}
									aria-label={`Search by ${key}`}
								>
									<Icon className="size-3.5" />
								</button>
							))}
						</div>

						{/* ⌘K badge */}
						<span className="hidden shrink-0 items-center gap-0.5 rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60 transition-colors group-hover:text-muted-foreground sm:inline-flex">
							<KeyboardIcon className="size-2.5" />
							<span>K</span>
						</span>

						{/* Expand arrow */}
						<button
							type="button"
							onClick={() => setWidgetMode(false)}
							className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:text-muted-foreground"
							aria-label="Expand to full page"
						>
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="size-3.5"
							>
								<polyline points="15 3 21 3 21 9" />
								<polyline points="9 21 3 21 3 15" />
								<line x1="21" x2="14" y1="3" y2="10" />
								<line x1="3" x2="10" y1="21" y2="14" />
							</svg>
						</button>
					</div>
				</div>
			</>
		);
	}

	// ─── Full Hero Mode ──────────────────────────────────
	return (
		<>
			<CommandMenu
				open={cmdOpen}
				onOpenChange={setCmdOpen}
				onModeSelect={openCmdForMode}
			/>

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

					{/* Clean search bar — no mode buttons by default */}
					<div className="mx-auto mt-10 max-w-2xl" ref={searchRef}>
						<div
							className="group relative cursor-pointer rounded-xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:border-muted-foreground/20"
							role="button"
							tabIndex={0}
							onClick={() => setCmdOpen(true)}
							onMouseEnter={() => setIsHovered(true)}
							onMouseLeave={() => setIsHovered(false)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									setCmdOpen(true);
								}
							}}
							aria-label="Open search command menu"
						>
							<div className="flex h-12 items-center gap-3 px-4 sm:h-14 sm:px-5">
								<SearchIcon className="size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-muted-foreground" />

								<span className="flex-1 text-left text-sm font-light text-muted-foreground/50 transition-colors group-hover:text-muted-foreground/70">
									{getPlaceholder()}
								</span>

								{/* Mode icons — hidden by default, appear on hover with elegant animation */}
								<div
									className={`flex items-center gap-0.5 transition-all duration-300 ${
										isHovered
											? "w-auto opacity-100"
											: "w-0 overflow-hidden opacity-0"
									}`}
								>
									<span className="mr-1 h-4 w-px bg-border" />
									{MODES.map(({ key, icon: Icon }) => (
										<button
											key={key}
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												openCmdForMode(key);
											}}
											className={`flex size-7 items-center justify-center rounded-md transition-all duration-200 sm:size-8 ${
												mode === key
													? `${modeActiveColors[key]} bg-muted`
													: "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50"
											}`}
											aria-label={`Search by ${key}`}
										>
											<Icon className="size-3.5 sm:size-4" />
										</button>
									))}
								</div>

								{/* ⌘K badge */}
								<span className="hidden shrink-0 items-center gap-0.5 rounded-md border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/50 transition-all group-hover:border-border group-hover:text-muted-foreground sm:inline-flex">
									<KeyboardIcon className="size-2.5" />
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
									className="inline-flex cursor-pointer items-center rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs font-light text-muted-foreground/70 transition-all hover:border-muted-foreground/30 hover:bg-muted/50 hover:text-foreground"
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
							className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs font-light text-muted-foreground/60 transition-all hover:border-border hover:bg-muted/40 hover:text-foreground"
						>
							<SparklesIcon className="size-3" />
							<span>AI Assistant widget</span>
						</button>
					</div>
				</div>
			</section>
		</>
	);
}
