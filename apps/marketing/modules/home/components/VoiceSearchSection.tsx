"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { MicIcon, HeadphonesIcon, HistoryIcon, FileTextIcon, SearchCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function VoiceSearchSection() {
	const t = useTranslations();
	const [demoActive, setDemoActive] = useState(false);

	return (
		<section className="section-padding border-b border-border">
			<div className="container">
				<div className="max-w-3xl mx-auto text-center">
					<span className="mb-4 gap-2 px-3 py-1 text-xs font-semibold tracking-widest inline-flex w-fit items-center rounded-md border border-border bg-secondary text-muted-foreground uppercase mx-auto">
						<MicIcon className="size-3" />
						Voice
					</span>
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						Voice-first when useful. Screen-first when clarity matters.
					</h2>
					<p className="mt-4 text-lg font-light text-balance text-muted-foreground">
						Push-to-talk, live transcript, edit-before-search, and visual results always
						alongside voice. No always-listening. No awkward auto-play.
					</p>
				</div>

				<div className="mt-12 md:mt-16 max-w-4xl mx-auto">
					<div className="lg:grid-cols-[1fr_1.5fr] gap-8 lg:gap-12 grid grid-cols-1">
						{/* Voice demo */}
						<div className="flex flex-col items-center justify-center text-center">
							<button
								onClick={() => setDemoActive(!demoActive)}
				className={`size-20 flex items-center justify-center rounded-full border-2 transition-all ${
							demoActive
								? "border-foreground/20 bg-foreground/5 scale-110 shadow-lg"
								: "border-border bg-muted hover:border-foreground/20 hover:bg-muted/80"
						}`}
							>
								<MicIcon
									className={`size-8 transition-colors ${
										demoActive ? "text-foreground" : "text-muted-foreground"
									} ${demoActive ? "animate-pulse" : ""}`}
								/>
							</button>
							<p className="mt-4 text-sm font-light text-muted-foreground">
								{demoActive ? "Recording... tap to stop" : "Tap microphone to try"}
							</p>

							{demoActive && (
								<div className="mt-4 gap-0.5 flex items-center justify-center">
									{[2, 4, 6, 8, 10, 8, 6, 4, 2].map((h, i) => (
										<div
											key={i}
											className="w-1 rounded-full bg-foreground/60"
											style={{ height: `${h}px`, animationDelay: `${i * 0.1}s` }}
										/>
									))}
								</div>
							)}
						</div>

						{/* Feature cards */}
						<div className="gap-4 grid">
							<div className="gap-3 px-5 py-4 flex items-start rounded-lg border border-border bg-card">
								<div className="size-10 shrink-0 rounded-md bg-muted flex items-center justify-center">
									<MicIcon className="size-5 text-muted-foreground" />
								</div>
								<div>
									<h3 className="text-sm font-medium text-foreground">Push-to-talk</h3>
									<p className="mt-0.5 text-xs font-light leading-relaxed text-muted-foreground">
										Microphone activates only on tap. No constant listening, no privacy
										concerns.
									</p>
								</div>
							</div>

							<div className="gap-3 px-5 py-4 flex items-start rounded-lg border border-border bg-card">
								<div className="size-10 shrink-0 rounded-md bg-muted flex items-center justify-center">
									<FileTextIcon className="size-5 text-muted-foreground" />
								</div>
								<div>
									<h3 className="text-sm font-medium text-foreground">Live transcript</h3>
									<p className="mt-0.5 text-xs font-light leading-relaxed text-muted-foreground">
										See what the system heard. Edit transcript before searching. Visual
										results always alongside voice.
									</p>
								</div>
							</div>

							<div className="gap-3 px-5 py-4 flex items-start rounded-lg border border-border bg-card">
								<div className="size-10 shrink-0 rounded-md bg-muted flex items-center justify-center">
									<HistoryIcon className="size-5 text-muted-foreground" />
								</div>
								<div>
									<h3 className="text-sm font-medium text-foreground">
										Voice history & fallback
									</h3>
									<p className="mt-0.5 text-xs font-light leading-relaxed text-muted-foreground">
										Last voice query is saved. Fallback to text if recognition is
										unclear. Clear privacy state indicator.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Voice metrics */}
				<div className="mt-12 max-w-3xl mx-auto">
					<div className="sm:grid-cols-3 gap-6 grid grid-cols-1">
						<div className="text-center">
							<Badge status="info" className="mb-2 normal-case">
								Screenshot search
							</Badge>
							<p className="text-xs font-light text-muted-foreground">
								Take a photo of an error screen — find the exact doc
							</p>
						</div>
						<div className="text-center">
							<Badge status="info" className="mb-2 normal-case">
								Product photo search
							</Badge>
							<p className="text-xs font-light text-muted-foreground">
								Snap a product in-store — find it online instantly
							</p>
						</div>
						<div className="text-center">
							<Badge status="info" className="mb-2 normal-case">
								Voice + visual
							</Badge>
							<p className="text-xs font-light text-muted-foreground">
								Say &ldquo;like this but cheaper&rdquo; with a photo reference
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
