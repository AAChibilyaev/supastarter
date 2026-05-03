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
	ZapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { AiAssistantChat } from "./AiAssistantChat";
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

export function HeroSection() {
	const t = useTranslations("home");
	const [mode, setMode] = useState<SearchMode>("text");
	const [cmdOpen, setCmdOpen] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const [showWidget, setShowWidget] = useState(false);
	const sectionRef = useRef<HTMLElement>(null);

	// IntersectionObserver: auto-show AI Assistant toggle when hero scrolls out
	useEffect(() => {
		const el = sectionRef.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				setShowWidget(!entry.isIntersecting);
			},
			{ threshold: 0.08 },
		);

		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	// Global Cmd+K / Ctrl+K
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setCmdOpen(true);
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
		voice: "text-foreground",
		photo: "text-foreground",
		image: "text-foreground",
		chat: "text-foreground",
	};

	const openCmdForMode = useCallback((m: SearchMode) => {
		setMode(m);
		setCmdOpen(true);
	}, []);

	return (
		<>
			<CommandMenu open={cmdOpen} onOpenChange={setCmdOpen} onModeSelect={openCmdForMode} />


			{/* ─── Hero Section ───────────────────────────────── */}
			<section ref={sectionRef} className="relative overflow-hidden bg-background">
				<div className="section-padding relative z-10 container">
					{/* Heading */}
					<div className="max-w-3xl mx-auto text-center">
						<h1 className="text-4xl font-light tracking-tight md:text-5xl lg:text-6xl text-balance text-foreground">
							{t("hero.title")}
						</h1>
						<p className="mt-6 max-w-2xl text-base sm:text-lg font-light mx-auto text-balance text-muted-foreground">
							{t("hero.subtitle")}
						</p>
					</div>

					{/* Search bar */}
					<div className="mt-10 max-w-2xl mx-auto">
						<div
							className="group shadow-sm hover:shadow-md relative cursor-pointer rounded-xl border border-border bg-card transition-all duration-300 hover:border-muted-foreground/20"
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
							<div className="h-12 gap-3 px-4 sm:h-14 sm:px-5 flex items-center">
								<SearchIcon className="size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-muted-foreground" />

								<span className="text-sm font-light flex-1 text-left text-muted-foreground/50 transition-colors group-hover:text-muted-foreground/70">
									{getPlaceholder()}
								</span>

								<div
									className={`gap-0.5 flex items-center transition-all duration-300 ${
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
											className={`size-7 sm:size-8 flex items-center justify-center rounded-md transition-all duration-200 ${
												mode === key
													? `${modeActiveColors[key]} bg-muted`
													: "text-muted-foreground/40 hover:bg-muted/50 hover:text-muted-foreground"
											}`}
											aria-label={`Search by ${key}`}
										>
											<Icon className="size-3.5 sm:size-4" />
										</button>
									))}
								</div>

								<span className="gap-0.5 px-1.5 py-0.5 font-medium sm:inline-flex hidden shrink-0 items-center rounded-md border border-border/60 bg-muted/30 text-[10px] text-muted-foreground/50 transition-all group-hover:border-border group-hover:text-muted-foreground">
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
									className="px-3 py-1 text-xs font-light inline-flex cursor-pointer items-center rounded-full border border-border/60 bg-muted/30 text-muted-foreground/70 transition-all hover:border-muted-foreground/30 hover:bg-muted/50 hover:text-foreground"
								>
									{chip}
								</button>
							))}
						</div>
					</div>

					{/* CTA */}
					<div className="mt-8 gap-3 flex w-full items-center justify-center">
						<Button
							className="shrink-0"
							size="lg"
							variant="primary"
							asChild
						>
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
						<span className="gap-1.5 px-3 py-1 text-xs font-light inline-flex items-center rounded-full bg-muted text-muted-foreground">
							<ZapIcon className="size-3" />
							{t("hero.badgeLatency")}
						</span>
						<span className="gap-1.5 px-3 py-1 text-xs font-light inline-flex items-center rounded-full bg-muted text-muted-foreground">
							<ShieldIcon className="size-3" />
							{t("hero.badgeSoc2")}
						</span>
						<span className="gap-1.5 px-3 py-1 text-xs font-light inline-flex items-center rounded-full bg-muted text-muted-foreground">
							<SearchIcon className="size-3" />
							{t("hero.badgeFulltext")}
						</span>
						<span className="gap-1.5 px-3 py-1 text-xs font-light inline-flex items-center rounded-full bg-muted text-muted-foreground">
							<BarChart3Icon className="size-3" />
							{t("hero.badgeAnalytics")}
						</span>
					</div>

					{/* Stats */}
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
				</div>
			</section>

			{/* ─── AI Assistant Chat (auto on scroll) ──────────── */}
			<AiAssistantChat visible={showWidget} />
		</>
	);
}
