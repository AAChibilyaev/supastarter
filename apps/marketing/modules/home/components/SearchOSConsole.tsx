"use client";

import { cn } from "@repo/ui/lib";
import {
	ArrowRightIcon,
	CameraIcon,
	ImageIcon,
	MessageSquareIcon,
	MicIcon,
	SearchIcon,
	TypeIcon,
} from "lucide-react";

const INPUT_MODES = [
	{ key: "Text", icon: TypeIcon },
	{ key: "Voice", icon: MicIcon },
	{ key: "Image", icon: ImageIcon },
	{ key: "Screenshot", icon: CameraIcon },
	{ key: "Chat", icon: MessageSquareIcon },
] as const;

const ROUTE_STEPS = ["keyword", "vector", "graph", "rerank"];

export function SearchOSConsole() {
	return (
		<div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_24px_64px_rgba(15,23,42,0.06)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.30)]">
			{/* Header */}
			<div className="px-5 py-3 flex items-center justify-between border-b border-border/40">
				<div className="gap-2.5 flex items-center">
					<div className="size-5 flex items-center justify-center rounded-md border border-border/50 bg-muted/50">
						<SearchIcon className="size-3 text-muted-foreground/70" />
					</div>
					<span className="text-xs font-semibold text-foreground/90">
						AACSearch OS Console
					</span>
				</div>
				<div className="gap-2 flex items-center">
					<span className="size-1.5 bg-emerald-500/70 rounded-full" />
					<span className="font-medium tracking-wide text-emerald-600/70 dark:text-emerald-400/70 text-[10px] uppercase">
						Live request
					</span>
				</div>
			</div>

			<div className="space-y-5 p-5">
				{/* Query row */}
				<div className="space-y-2.5">
					<div className="gap-2.5 flex items-center">
						<span className="font-semibold tracking-wider text-[11px] text-muted-foreground/60 uppercase">
							Query intent
						</span>
						<div className="h-px flex-1 bg-border/30" />
					</div>
					<div className="px-4 py-2.5 rounded-xl border border-border/40 bg-muted/20">
						<span className="text-sm font-medium leading-snug text-foreground/90">
							error 401 in SDK after token refresh
						</span>
					</div>
				</div>

				{/* Input mode badges */}
				<div className="gap-1.5 flex flex-wrap">
					{INPUT_MODES.map((mode) => (
						<span
							key={mode.key}
							className={cn(
								"gap-1.5 px-2.5 py-1 font-medium inline-flex items-center rounded-full text-[11px] leading-none transition-colors",
								mode.key === "Text"
									? "bg-foreground/10 text-foreground/80"
									: "bg-muted/40 text-muted-foreground/60",
							)}
						>
							<mode.icon className="size-3" />
							{mode.key}
						</span>
					))}
				</div>

				{/* Two-column: Understanding + Route */}
				<div className="gap-4 grid grid-cols-[1fr_auto]">
					{/* Understanding */}
					<div className="space-y-2.5">
						<div className="gap-2.5 flex items-center">
							<span className="font-semibold tracking-wider text-[11px] text-muted-foreground/60 uppercase">
								Understanding
							</span>
							<div className="h-px flex-1 bg-border/30" />
						</div>
						<div className="space-y-1.5">
							{[
								["intent", "troubleshooting"],
								["entity", "error_401"],
								["collection", "developer_docs"],
							].map(([label, value]) => (
								<div key={label} className="gap-2 flex items-center">
									<span className="font-mono font-medium min-w-[52px] text-[11px] text-muted-foreground/50">
										{label}
									</span>
									<span className="font-mono font-medium truncate text-[11px] text-foreground/80">
										{value}
									</span>
								</div>
							))}
						</div>
					</div>

					{/* Vertical divider */}
					<div className="sm:block hidden w-px self-stretch bg-border/30" />

					{/* Retrieval route */}
					<div className="space-y-2.5 sm:min-w-[140px]">
						<div className="gap-2.5 flex items-center">
							<span className="font-semibold tracking-wider text-[11px] text-muted-foreground/60 uppercase">
								Route
							</span>
							<div className="h-px flex-1 bg-border/30" />
						</div>
						<div className="space-y-1.5">
							{ROUTE_STEPS.map((step, i) => (
								<div key={step} className="gap-1.5 flex items-center">
									<div className="size-1.5 shrink-0 rounded-full bg-foreground/20" />
									<span className="font-mono font-medium text-[11px] text-foreground/70">
										{step}
									</span>
									{i < ROUTE_STEPS.length - 1 && (
										<ArrowRightIcon className="size-2.5 text-muted-foreground/30" />
									)}
								</div>
							))}
						</div>
						<div className="mt-2 gap-1.5 px-2 py-1 flex items-center rounded-md bg-muted/30">
							<span className="font-mono font-medium text-[10px] text-muted-foreground/60">
								38 ms
							</span>
							<span className="font-medium text-[10px] text-muted-foreground/40">
								·
							</span>
							<span className="font-medium text-[10px] text-muted-foreground/60">
								hybrid match
							</span>
						</div>
					</div>
				</div>

				{/* Results */}
				<div className="space-y-2.5">
					<div className="gap-2.5 flex items-center">
						<span className="font-semibold tracking-wider text-[11px] text-muted-foreground/60 uppercase">
							Results
						</span>
						<div className="h-px flex-1 bg-border/30" />
					</div>
					<div className="space-y-1.5">
						{[
							{
								title: "SDK authentication guide",
								snippet: "How scoped tokens expire and refresh.",
								source: "Docs",
							},
							{
								title: "Token refresh reference",
								snippet: "TTL, HMAC signature and origin checks.",
								source: "API",
							},
							{
								title: "Origin allow-list",
								snippet: "Why browser requests can be rejected.",
								source: "Security",
							},
						].map((result, i) => (
							<div
								key={result.title}
								className="gap-3 px-3 py-2 flex items-start rounded-lg border border-border/30 bg-muted/15"
							>
								<span className="mt-0.5 font-mono font-semibold min-w-[14px] text-[10px] text-muted-foreground/40">
									{String(i + 1).padStart(2, "0")}
								</span>
								<div className="min-w-0 flex-1">
									<div className="gap-2 flex items-center">
										<span className="font-semibold truncate text-[12px] text-foreground/90">
											{result.title}
										</span>
										<span className="px-1.5 py-0.5 font-semibold tracking-wide shrink-0 rounded-md border border-border/30 bg-muted/30 text-[9px] text-muted-foreground/60 uppercase">
											{result.source}
										</span>
									</div>
									<p className="mt-0.5 font-normal truncate text-[11px] text-muted-foreground/60">
										{result.snippet}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Answer with citations */}
				<div className="space-y-2.5 px-4 py-3 rounded-xl border border-border/30 bg-muted/10">
					<div className="gap-2 flex items-center">
						<MessageSquareIcon className="size-3 text-muted-foreground/50" />
						<span className="font-semibold tracking-wider text-[11px] text-muted-foreground/60 uppercase">
							Answer with citations
						</span>
					</div>
					<p className="font-normal leading-relaxed text-[12px] text-foreground/80">
						The 401 is likely caused by an expired scoped token or an origin that is not
						included in the allow-list.
					</p>
					<div className="gap-2 flex flex-wrap">
						{["Token refresh guide", "Origin allow-list"].map((ref) => (
							<span
								key={ref}
								className="gap-1 px-2 py-0.5 font-medium inline-flex items-center rounded-md border border-border/30 bg-muted/20 text-[10px] text-muted-foreground/60"
							>
								<span className="size-1 rounded-full bg-foreground/15" />
								{ref}
							</span>
						))}
					</div>
				</div>

				{/* Security strip */}
				<div className="gap-2.5 px-3.5 py-2 flex flex-wrap items-center rounded-lg border border-border/20 bg-muted/10">
					<span className="font-semibold tracking-wider text-[10px] text-muted-foreground/50 uppercase">
						Scoped access
					</span>
					<div className="h-3 w-px bg-border/30" />
					<span className="font-mono font-medium text-[10px] text-muted-foreground/60">
						tenant: demo-store
					</span>
					<div className="h-3 w-px bg-border/30" />
					<span className="font-mono font-medium text-[10px] text-muted-foreground/60">
						TTL: 1h
					</span>
					<div className="h-3 w-px bg-border/30" />
					<span className="gap-1 font-medium text-emerald-600/70 dark:text-emerald-400/70 inline-flex items-center text-[10px]">
						<span className="size-1 bg-emerald-500/70 rounded-full" />
						origin verified
					</span>
				</div>
			</div>
		</div>
	);
}
