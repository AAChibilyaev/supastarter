"use client";

import { config } from "@config";
import { Button } from "@repo/ui/components/button";
import {
	ArrowRightIcon,
	BarChart3Icon,
	CameraIcon,
	ImageIcon,
	KeyboardIcon,
	MicIcon,
	SearchIcon,
	ShieldIcon,
	SparklesIcon,
	ZapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

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
	{ key: "chat", icon: SparklesIcon },
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

	return (
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

				{/* Multimodal search bar */}
				<div className="mx-auto mt-10 max-w-2xl">
					<div className="rounded-xl border border-border bg-card shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
						<div className="flex h-12 items-center gap-3 px-4">
							<SearchIcon className="size-4 shrink-0 text-muted-foreground" />
							<input
								type="text"
								placeholder={getPlaceholder()}
								className="flex-1 bg-transparent text-sm font-light outline-none text-foreground placeholder:text-muted-foreground/60"
							/>
							<div className="flex items-center gap-0.5">
								{MODES.map(({ key, icon: Icon }) => (
									<button
										key={key}
										type="button"
										onClick={() => setMode(key)}
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
						</div>
					</div>

					{/* Chips */}
					<div className="mt-4 gap-2 flex flex-wrap items-center justify-center">
						{CHIPS.map((chip) => (
							<span
								key={chip}
								className="inline-flex cursor-pointer items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-light text-muted-foreground transition-colors hover:border-muted-foreground/30 hover:text-foreground"
							>
								{chip}
							</span>
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
			</div>
		</section>
	);
}
