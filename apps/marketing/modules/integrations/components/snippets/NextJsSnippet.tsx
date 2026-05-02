interface NextJsSnippetProps {
	title: string;
}

const CODE = `import { AACSearchClient } from '@aacsearch/client'

const client = new AACSearchClient({
  apiKey: process.env.AACSEARCH_API_KEY!,
  index: 'products',
})

export default async function ProductSearch() {
  const results = await client.search({ q: 'running shoes', limit: 10 })
  return (
    <ul>
      {results.hits.map((hit) => (
        <li key={hit.id}>{hit.name}</li>
      ))}
    </ul>
  )
}`;

export function NextJsSnippet({ title }: NextJsSnippetProps) {
	return (
		<section className="py-20 border-b border-border/60">
			<div className="container">
				<div className="max-w-3xl mx-auto">
					<h2 className="mb-8 font-medium text-3xl tracking-tight md:text-4xl text-center text-balance">
						{title}
					</h2>
					<div className="bg-zinc-950 shadow-lg relative overflow-hidden rounded-xl border border-border/40">
						<div className="gap-1.5 px-4 py-3 border-white/10 bg-zinc-900/80 flex items-center border-b">
							<span className="size-3 bg-red-500/70 rounded-full" />
							<span className="size-3 bg-yellow-500/70 rounded-full" />
							<span className="size-3 bg-green-500/70 rounded-full" />
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
