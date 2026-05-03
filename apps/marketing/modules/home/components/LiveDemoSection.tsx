export function LiveDemoSection() {
	return (
		<section className="section-padding border-b border-border">
			<div className="container">
				<div className="max-w-3xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						Попробуйте поиск прямо сейчас
					</h2>
					<p className="mt-4 text-lg font-light text-balance text-muted-foreground">
						Интерактивная поисковая строка над каталогом из 10 000 товаров. 
						Попробуйте: «кроссовки Nike», «iPhone», «бренд Samsung».
					</p>
				</div>

				<div className="mt-10 mx-auto max-w-2xl">
					<div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
						{/* Demo search bar */}
						<div className="gap-3 p-4 flex items-center border-b border-border bg-muted/30">
							<svg className="size-4 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
								<path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
							</svg>
							<input
								type="text"
								readOnly
								placeholder="кроссовки Nike размер 42"
								className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-hidden"
								onFocus={(e) => (e.target.value = "попробуйте в Playground →")}
							/>
							<span className="text-xs text-muted-foreground/50 shrink-0">
								⌘K
							</span>
						</div>

						{/* Mock search results */}
						<div className="gap-3 p-4 flex flex-col">
							{[...Array(3)].map((_, i) => (
								<div key={i} className="gap-3 flex items-start">
									<div className="size-12 shrink-0 rounded-lg bg-muted" />
									<div className="min-w-0 flex-1">
										<div className="h-4 w-3/4 rounded bg-muted" />
										<div className="mt-1.5 h-3 w-1/2 rounded bg-muted/60" />
									</div>
									<div className="h-4 w-12 rounded bg-muted/40" />
								</div>
							))}
						</div>
					</div>
				</div>

				<p className="mt-6 text-center text-sm text-muted-foreground">
					<a
						href="/demo"
						className="font-medium text-primary underline-offset-4 hover:underline"
					>
						Полноценный Playground в дашборде →
					</a>
				</p>
			</div>
		</section>
	);
}
