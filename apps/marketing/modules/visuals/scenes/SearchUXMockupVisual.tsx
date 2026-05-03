import { FilterIcon, SearchIcon } from "lucide-react";

import { ResultCard } from "../components/ResultCard";
import { SearchInputMock } from "../components/SearchInputMock";
import { VisualFrame } from "../components/VisualFrame";

const FACETS = [
	{ label: "Category", values: ["Sneakers (124)", "Running (89)", "Casual (56)"] },
	{ label: "Brand", values: ["Nike (78)", "Adidas (54)", "New Balance (32)"] },
	{ label: "Price", values: ["Under $50 (23)", "$50–$150 (87)", "$150+ (42)"] },
] as const;

export function SearchUXMockupVisual() {
	return (
		<VisualFrame className="p-5 md:p-6">
			{/* Search bar row */}
			<div className="mb-5 gap-2 flex items-center">
				<SearchInputMock
					query="nkie air max — corrected to: nike air max"
					latency="38ms"
					className="flex-1"
				/>
				<div className="gap-1.5 px-3 py-3 flex items-center rounded-lg border border-border bg-muted/30">
					<FilterIcon className="size-4 text-muted-foreground" />
					<span className="text-xs text-muted-foreground">Filters</span>
				</div>
			</div>

			<div className="gap-4 md:grid-cols-[1fr_180px] grid">
				{/* Results */}
				<div className="space-y-2.5">
					{/* Autocomplete row */}
					<div className="gap-2 px-4 py-2.5 flex flex-wrap items-center rounded-lg border border-border bg-muted/30">
						<SearchIcon className="size-3.5 text-muted-foreground" />
						<span className="text-xs text-muted-foreground">Suggestions:</span>
						{["nike air max 270", "nike air max 90", "nike air max 97"].map((s) => (
							<span
								key={s}
								className="rounded px-2 py-0.5 bg-muted text-[11px] text-foreground"
							>
								{s}
							</span>
						))}
					</div>

					{/* Typo notice */}
					<div className="px-4 py-2 rounded-lg border border-border bg-muted/30">
						<p className="text-[11px] text-muted-foreground">
							Showing results for{" "}
							<span className="font-medium text-foreground">nike air max</span> — typo
							corrected automatically
						</p>
					</div>

					<ResultCard
						title="Nike Air Max 270 React"
						titleHighlight="Nike Air Max"
						description="Men's running shoe. Breathable mesh, Max Air unit in heel. Available in 8 colors."
						category="Sneakers"
						score={0.97}
					/>
					<ResultCard
						title="Nike Air Max 90 Essential"
						titleHighlight="Nike Air Max"
						description="Classic lifestyle sneaker. Leather and mesh upper, visible Air cushioning."
						category="Sneakers"
						score={0.91}
					/>
					<ResultCard
						title="Nike Air Max 97 Silver Bullet"
						titleHighlight="Nike Air Max"
						description="Iconic full-length Air sole. Rippled design inspired by bullet train."
						category="Sneakers"
						score={0.88}
					/>

					<div className="px-1 flex items-center justify-between">
						<span className="text-[10px] text-muted-foreground">152 results</span>
						<span className="text-[10px] text-muted-foreground">
							38ms · exact + fuzzy match
						</span>
					</div>
				</div>

				{/* Facet panel */}
				<div className="space-y-4">
					{FACETS.map((facet) => (
						<div key={facet.label}>
							<p className="mb-2 font-medium tracking-widest text-[10px] text-muted-foreground uppercase">
								{facet.label}
							</p>
							<div className="space-y-1.5">
								{facet.values.map((v) => (
									<div key={v} className="gap-2 flex items-center">
										<div className="size-3.5 rounded border border-border bg-muted/50" />
										<span className="text-xs text-muted-foreground">{v}</span>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</VisualFrame>
	);
}
