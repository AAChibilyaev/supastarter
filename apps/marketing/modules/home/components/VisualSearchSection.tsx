"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { CameraIcon, ImageIcon, ScatterChartIcon, CombineIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function VisualSearchSection() {
	const t = useTranslations();

	return (
		<section className="section-padding border-b border-border bg-muted/30">
			<div className="container">
				<div className="max-w-3xl mx-auto text-center">
					<span className="mb-4 gap-2 px-3 py-1 text-xs font-semibold tracking-widest mx-auto inline-flex w-fit items-center rounded-md border border-border bg-secondary text-muted-foreground uppercase">
						<CameraIcon className="size-3" />
						Visual
					</span>
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						Photo search + image search — two scenarios, one engine
					</h2>
					<p className="mt-4 text-lg font-light text-balance text-muted-foreground">
						Snap a photo to find similar products. Upload a reference image or
						screenshot to find matching assets, docs, or designs.
					</p>
				</div>

				<div className="mt-12 md:mt-16 lg:grid-cols-2 gap-8 lg:gap-12 grid grid-cols-1">
					{/* Photo search */}
					<div className="p-6 md:p-8 rounded-xl border border-border bg-card">
						<div className="gap-4 flex items-center">
							<div className="size-12 flex shrink-0 items-center justify-center rounded-lg bg-muted">
								<CameraIcon className="size-6 text-muted-foreground" />
							</div>
							<div>
								<h3 className="text-lg font-light">Photo search</h3>
								<p className="text-sm font-light text-muted-foreground">
									Mobile-first: snap and search
								</p>
							</div>
						</div>

						<div className="mt-6 gap-3 grid">
							<div className="gap-3 px-3 py-3 flex items-center rounded-md border border-border bg-background">
								<div className="size-8 flex shrink-0 items-center justify-center rounded-md bg-muted">
									<CameraIcon className="size-4 text-muted-foreground" />
								</div>
								<span className="text-sm text-foreground">
									Find similar products in-store
								</span>
							</div>
							<div className="gap-3 px-3 py-3 flex items-center rounded-md border border-border bg-background">
								<div className="size-8 flex shrink-0 items-center justify-center rounded-md bg-muted">
									<CameraIcon className="size-4 text-muted-foreground" />
								</div>
								<span className="text-sm text-foreground">
									Identify item by photo
								</span>
							</div>
							<div className="gap-3 px-3 py-3 flex items-center rounded-md border border-border bg-background">
								<div className="size-8 flex shrink-0 items-center justify-center rounded-md bg-muted">
									<CameraIcon className="size-4 text-muted-foreground" />
								</div>
								<span className="text-sm text-foreground">
									Find docs by error screen photo
								</span>
							</div>
						</div>
					</div>

					{/* Image search */}
					<div className="p-6 md:p-8 rounded-xl border border-border bg-card">
						<div className="gap-4 flex items-center">
							<div className="size-12 flex shrink-0 items-center justify-center rounded-lg bg-muted">
								<ImageIcon className="size-6 text-muted-foreground" />
							</div>
							<div>
								<h3 className="text-lg font-light">Image search</h3>
								<p className="text-sm font-light text-muted-foreground">
									Desktop: upload reference, screenshot, design
								</p>
							</div>
						</div>

						<div className="mt-6 gap-3 grid">
							<div className="gap-3 px-3 py-3 flex items-center rounded-md border border-border bg-background">
								<div className="size-8 flex shrink-0 items-center justify-center rounded-md bg-muted">
									<ImageIcon className="size-4 text-muted-foreground" />
								</div>
								<span className="text-sm text-foreground">
									Similar assets by reference image
								</span>
							</div>
							<div className="gap-3 px-3 py-3 flex items-center rounded-md border border-border bg-background">
								<div className="size-8 flex shrink-0 items-center justify-center rounded-md bg-muted">
									<ImageIcon className="size-4 text-muted-foreground" />
								</div>
								<span className="text-sm text-foreground">
									Search UI components by screenshot
								</span>
							</div>
							<div className="gap-3 px-3 py-3 flex items-center rounded-md border border-border bg-background">
								<div className="size-8 flex shrink-0 items-center justify-center rounded-md bg-muted">
									<ImageIcon className="size-4 text-muted-foreground" />
								</div>
								<span className="text-sm text-foreground">
									Combine image + text: &ldquo;similar but black&rdquo;
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* How it works flow */}
				<div className="mt-12 md:mt-16 max-w-3xl mx-auto">
					<h3 className="text-lg font-light mb-6 text-center text-foreground">
						Visual search pipeline
					</h3>

					<div className="sm:grid-cols-4 gap-4 grid grid-cols-2">
						<div className="text-center">
							<div className="size-12 mx-auto flex items-center justify-center rounded-full bg-muted">
								<CameraIcon className="size-5 text-muted-foreground" />
							</div>
							<p className="mt-2 text-xs font-medium text-foreground">Upload</p>
						</div>
						<div className="text-center">
							<div className="size-12 mx-auto flex items-center justify-center rounded-full bg-muted">
								<ScatterChartIcon className="size-5 text-muted-foreground" />
							</div>
							<p className="mt-2 text-xs font-medium text-foreground">Embeddings</p>
						</div>
						<div className="text-center">
							<div className="size-12 mx-auto flex items-center justify-center rounded-full bg-muted">
								<CombineIcon className="size-5 text-muted-foreground" />
							</div>
							<p className="mt-2 text-xs font-medium text-foreground">Hybrid rank</p>
						</div>
						<div className="text-center">
							<div className="size-12 mx-auto flex items-center justify-center rounded-full bg-muted">
								<ImageIcon className="size-5 text-muted-foreground" />
							</div>
							<p className="mt-2 text-xs font-medium text-foreground">Results</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
