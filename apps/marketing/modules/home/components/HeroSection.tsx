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

import { CommandMenu } from "./CommandMenu";
import { SearchOSConsole } from "./SearchOSConsole";

type SearchMode = "text" | "voice" | "photo" | "image" | "chat";

const MODES: { key: SearchMode; icon: typeof KeyboardIcon; label: string }[] = [
	{ key: "text", icon: KeyboardIcon, label: "Text" },
	{ key: "voice", icon: MicIcon, label: "Voice" },
	{ key: "image", icon: ImageIcon, label: "Image" },
	{ key: "photo", icon: CameraIcon, label: "Screenshot" },
	{ key: "chat", icon: MessageSquareIcon, label: "Chat" },
];

const CHIPS = [
	"error 401 в документации",
	"похожие товары по фото",
	"заказ #1042",
	"изменения в billing",
	"связанные инциденты",
	"ответ с цитатами",
];

const BADGES = [
	{ icon: ZapIcon, key: "badgeLatency" },
	{ icon: SearchIcon, key: "badgeVector" },
	{ icon: ShieldIcon, key: "badgeSoc2" },
	{ icon: KeyboardIcon, key: "badgeFulltext" },
	{ icon: BarChart3Icon, key: "badgeAnalytics" },
];

const METRICS = [
	{ value: "2.5M+", labelKey: "hero.statDocs" },
	{ value: "< 50 мс", labelKey: "hero.statLatency" },
	{ value: "99.95%", labelKey: "hero.statUptime" },
];

export function HeroSection() {
	const t = useTranslations("home");
	const [mode, setMode] = useState<SearchMode>("text");
	const [cmdOpen, setCmdOpen] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const sectionRef = useRef<HTMLElement>(null);

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

	const openCmdForMode = useCallback((m: SearchMode) => {
		setMode(m);
		setCmdOpen(true);
	}, []);

	return (
		<>
			<CommandMenu open={cmdOpen} onOpenChange={setCmdOpen} onModeSelect={openCmdForMode} />

			<section
				ref={sectionRef}
				className="relative overflow-hidden border-b border-border/50"
			>
				{/* Background gradient */}
				<div className="inset-0 pointer-events-none absolute bg-[radial-gradient(ellipse_at_12%_0%,rgba(15,23,42,0.035),transparent_40rem),radial-gradient(ellipse_at_88%_4%,rgba(15,23,42,0.02),transparent_36rem)] dark:bg-[radial-gradient(ellipse_at_12%_0%,rgba(255,255,255,0.025),transparent_40rem),radial-gradient(ellipse_at_88%_4%,rgba(255,255,255,0.015),transparent_36rem)]" />

				<div
					className="px-5 lg:px-6 relative z-10 mx-auto w-full py-[clamp(64px,10vw,120px)]"
					style={{ maxWidth: "1240px" }}
				>
					<div className="gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 xl:gap-20 grid grid-cols-1">
						{/* ─── Left column: copy ─────────────────── */}
						<div className="flex flex-col">
							{/* Eyebrow */}
							<div className="mb-5 gap-1 flex flex-col">
								<span className="text-sm font-semibold tracking-tight text-foreground">
									AACSearch OS
								</span>
								<span className="font-medium text-[11px] tracking-[0.08em] text-muted-foreground/60 uppercase">
									Search · Discovery · GraphRAG · Security
								</span>
							</div>

							{/* H1 */}
							<h1 className="font-semibold text-[clamp(2.5rem,6.5vw,4.75rem)] leading-[0.95] tracking-[-0.065em] text-balance text-foreground">
								Search OS для продуктов,
								<br />
								каталогов и баз знаний
							</h1>

							{/* Subtitle */}
							<p className="mt-6 text-base font-normal leading-relaxed md:text-lg max-w-[680px] text-balance text-secondary-foreground/80">
								{/* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */}
								{t("hero.subtitle")}
							</p>

							{/* Search input */}
							<div className="mt-8">
								<div
									className="group relative cursor-pointer rounded-2xl border border-border/60 bg-card transition-all duration-200 hover:border-border hover:shadow-[0_0_0_4px_rgba(15,23,42,0.06)] dark:hover:shadow-[0_0_0_4px_rgba(255,255,255,0.04)]"
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
										<SearchIcon className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground/70" />

										<span className="text-sm font-normal flex-1 text-left text-muted-foreground/50 transition-colors group-hover:text-muted-foreground/70">
											{getPlaceholder()}
										</span>

										{/* Mode icons (show on hover) */}
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
													className={`size-7 sm:size-8 flex items-center justify-center rounded-lg transition-all duration-200 ${
														mode === key
															? "bg-muted text-foreground"
															: "text-muted-foreground/30 hover:bg-muted/50 hover:text-muted-foreground"
													}`}
													aria-label={`Search by ${key}`}
												>
													<Icon className="size-3.5 sm:size-4" />
												</button>
											))}
										</div>

										{/* Cmd+K badge */}
										<span className="gap-0.5 px-1.5 py-0.5 font-medium sm:inline-flex hidden shrink-0 items-center rounded-md border border-border/50 bg-muted/30 text-[10px] text-muted-foreground/50 transition-all group-hover:border-border/70 group-hover:text-muted-foreground/70">
											<KeyboardIcon className="size-2.5" />
											<span>K</span>
										</span>
									</div>
								</div>

								{/* Chips */}
								<div className="mt-3 gap-2 flex flex-wrap items-center">
									{CHIPS.map((chip) => (
										<button
											key={chip}
											type="button"
											onClick={() => setCmdOpen(true)}
											className="h-7 px-2.5 font-medium inline-flex cursor-pointer items-center rounded-full border border-border/50 bg-muted/20 text-[12px] text-muted-foreground/70 transition-all hover:border-border/70 hover:bg-muted/40 hover:text-foreground/80"
										>
											{chip}
										</button>
									))}
								</div>
							</div>

							{/* CTA */}
							<div className="mt-8 gap-3 flex flex-wrap items-center">
								<Button
									className="px-5 shrink-0 rounded-xl"
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
									<Button
										className="shrink-0 rounded-xl"
										variant="outline"
										size="lg"
										asChild
									>
										<a href={config.docsUrl}>{t("hero.documentation")}</a>
									</Button>
								)}
							</div>

							{/* Badges */}
							<div className="mt-7 gap-2 flex flex-wrap items-center">
								{BADGES.map(({ icon: Icon, key }) => (
									<span
										key={key}
										className="h-7 gap-1.5 px-2.5 font-medium inline-flex items-center rounded-full border border-border/40 bg-card/60 text-[12px] text-muted-foreground/80"
									>
										<Icon className="size-3 text-muted-foreground/50" />
										{t(`hero.${key}`)}
									</span>
								))}
							</div>

							{/* Metrics */}
							<div className="mt-8 gap-6 pt-6 grid grid-cols-3 border-t border-border/40">
								{METRICS.map((metric) => (
									<div key={metric.labelKey}>
										<div className="text-xl font-semibold sm:text-2xl leading-none tracking-[-0.045em] text-foreground tabular-nums">
											{metric.value}
										</div>
										<div className="mt-2 font-normal leading-snug text-[13px] text-muted-foreground/70">
											{t(metric.labelKey)}
										</div>
									</div>
								))}
							</div>
						</div>

						{/* ─── Right column: OS Console visual ─── */}
						<div className="flex items-center">
							<div className="w-full">
								{/* Label above visual */}
								<div className="mb-4 gap-2 flex items-center">
									<div className="size-1.5 rounded-full bg-foreground/15" />
									<span className="font-medium text-[11px] tracking-[0.06em] text-muted-foreground/50 uppercase">
										AACSearch OS Console
									</span>
									<div className="h-px flex-1 bg-border/30" />
								</div>
								<SearchOSConsole />
							</div>
						</div>
					</div>
				</div>
			</section>
		</>
	);
}
