interface ReactSnippetProps {
	title: string;
}

const CODE = `import { useSearch } from '@aacsearch/react'

export function SearchBox() {
  const { query, setQuery, hits, isLoading } = useSearch({
    apiKey: 'ss_search_your_key',
    index: 'products',
  })
  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
      />
      {isLoading && <span>Loading...</span>}
      {hits.map((hit) => <div key={hit.id}>{hit.name}</div>)}
    </div>
  )
}`;

export function ReactSnippet({ title }: ReactSnippetProps) {
	return (
		<section className="section-padding border-b border-border/60">
			<div className="container">
				<div className="max-w-3xl mx-auto">
					<h2 className="mb-8 font-medium text-3xl tracking-tight md:text-4xl text-center text-balance">
						{title}
					</h2>
					<div className="bg-zinc-950 shadow-lg relative overflow-hidden rounded-xl border border-border/40">
						<div className="gap-1.5 px-4 py-3 border-white/10 bg-zinc-900/80 flex items-center border-b">
							<span className="size-3 rounded-full bg-muted-foreground/20" />
							<span className="size-3 rounded-full bg-muted-foreground/30" />
							<span className="size-3 rounded-full bg-muted-foreground/40" />
							<span className="ml-2 text-xs text-zinc-500 font-mono">typescript</span>
						</div>
						<pre className="p-5 text-sm leading-relaxed overflow-x-auto">
							<code className="text-zinc-200 font-mono whitespace-pre">{CODE}</code>
						</pre>
					</div>
				</div>
			</div>
		</section>
	);
}
