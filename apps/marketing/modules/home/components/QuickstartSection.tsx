"use client";

import { cn } from "@repo/ui";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

type Lang = "js" | "python" | "curl";
type StepKey = "create" | "index" | "token" | "search";

const STEP_SHORT: Record<StepKey, string> = {
	create: "Create index",
	index: "Add documents",
	token: "Scoped token",
	search: "Search",
};

const STEPS: StepKey[] = ["create", "index", "token", "search"];

const CODE: Record<Lang, Record<StepKey, string>> = {
	js: {
		create: `import { AACsearch } from '@aacsearch/sdk';

const client = new AACsearch({
  projectId: 'proj_abc123',
  apiKey:    'ss_search_•••••••',
});

await client.collections.create({
  name: 'products',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'price', type: 'float'  },
    { name: 'brand', type: 'string', facet: true },
  ],
});`,
		index: `await client.documents.import('products', [
  {
    id: '1', title: 'Nike Air Max 270',
    price: 129.99, brand: 'Nike',
  },
  {
    id: '2', title: 'Adidas Ultraboost 23',
    price: 179.99, brand: 'Adidas',
  },
]);`,
		token: `// Generate a scoped token — safe for browser.
// Never expose your Admin API key client-side.
const token = await client.tokens.create({
  ttl:       3600,              // 1 hour
  origins:   ['myapp.com'],     // origin allow-list
  filter_by: 'tenant_id:myshop', // tenant isolation
});`,
		search: `// Browser / frontend — uses scoped token only
const results = await client.search('products', {
  q:         'nike shoes',
  query_by:  'title,brand',
  filter_by: 'price:<200',
  facet_by:  'brand',
  sort_by:   'price:asc',
});
// { hits: [...], facets: {...}, took_ms: 12 }`,
	},
	python: {
		create: `from aacsearch import AACsearch

client = AACsearch(
    project_id="proj_abc123",
    api_key="ss_search_•••••••",
)

client.collections.create({
    "name": "products",
    "fields": [
        {"name": "title", "type": "string"},
        {"name": "price", "type": "float"},
        {"name": "brand", "type": "string", "facet": True},
    ],
})`,
		index: `client.documents.import_many("products", [
    {
        "id": "1", "title": "Nike Air Max 270",
        "price": 129.99, "brand": "Nike",
    },
    {
        "id": "2", "title": "Adidas Ultraboost 23",
        "price": 179.99, "brand": "Adidas",
    },
])`,
		token: `# Generate a scoped token for browser use.
token = client.tokens.create({
    "ttl":       3600,
    "origins":   ["myapp.com"],
    "filter_by": "tenant_id:myshop",
})
# Send token to browser — safe to expose`,
		search: `results = client.search("products", {
    "q":         "nike shoes",
    "query_by":  "title,brand",
    "filter_by": "price:<200",
    "facet_by":  "brand",
    "sort_by":   "price:asc",
})
# {'hits': [...], 'facets': {...}, 'took_ms': 12}`,
	},
	curl: {
		create: `curl -X POST https://api.aacsearch.com/v1/collections \\
  -H "Authorization: Bearer ss_search_•••••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "products",
    "fields": [
      {"name":"title","type":"string"},
      {"name":"price","type":"float"},
      {"name":"brand","type":"string","facet":true}
    ]
  }'`,
		index: `curl -X POST https://api.aacsearch.com/v1/indexes/products/documents/import \\
  -H "Authorization: Bearer ss_search_•••••••" \\
  -H "Content-Type: application/x-ndjson" \\
  --data-binary \\
  '{"id":"1","title":"Running Shoes Pro","price":129.99,"brand":"SportCo"}
{"id":"2","title":"Urban Walker X","price":179.99,"brand":"CityGear"}'`,
		token: `curl -X POST https://api.aacsearch.com/v1/tokens \\
  -H "Authorization: Bearer ss_search_•••••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "ttl": 3600,
    "origins": ["myapp.com"],
    "filter_by": "tenant_id:myshop"
  }'`,
		search: `curl "https://api.aacsearch.com/v1/indexes/products/search\\
?q=nike+shoes\\
&query_by=title,brand\\
&filter_by=price:%3C200\\
&facet_by=brand" \\
  -H "Authorization: Bearer ss_scoped_•••••••"`,
	},
};

export function QuickstartSection() {
	const t = useTranslations();
	const [lang, setLang] = useState<Lang>("js");
	const [activeStep, setActiveStep] = useState<StepKey>("create");
	const [copied, setCopied] = useState(false);

	const code = CODE[lang][activeStep];

	const copy = useCallback(() => {
		void navigator.clipboard.writeText(code).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1800);
		});
	}, [code]);

	return (
		<section className="section-padding border-b border-border">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						{t("homeQuickstart.title")}
					</h2>
					<p className="mt-4 text-lg font-light text-balance text-muted-foreground">
						{t("homeQuickstart.subtitle")}
					</p>
				</div>

				<div className="mt-12 md:mt-16 max-w-3xl mx-auto">
					{/* Step tabs */}
					<div className="gap-1 mb-0 flex flex-wrap">
						{STEPS.map((step, idx) => {
							const isActive = activeStep === step;
							const isDone = idx < STEPS.indexOf(activeStep);
							return (
								<button
									key={step}
									type="button"
									onClick={() => setActiveStep(step)}
									className={cn(
										"gap-2 px-4 py-2.5 text-sm flex items-center rounded-t-lg border border-b-0 transition-all",
										isActive
											? "text-zinc-100 border-zinc-800 bg-zinc-950"
											: "border-border bg-muted/50 text-muted-foreground hover:text-foreground",
									)}
								>
									<span
										className={cn(
											"size-4 font-semibold flex shrink-0 items-center justify-center rounded-md text-[10px]",
											isDone
												? "bg-success/20 text-success"
												: isActive
													? "bg-zinc-700/50 text-zinc-300"
													: "bg-muted text-muted-foreground",
										)}
									>
										{isDone ? <CheckIcon className="size-2.5" /> : idx + 1}
									</span>
									<span className="sm:inline hidden">{STEP_SHORT[step]}</span>
								</button>
							);
						})}
					</div>

					{/* Code panel */}
					<div className="border-zinc-800 bg-zinc-950 overflow-hidden rounded-tr-xl rounded-b-xl border">
						{/* Toolbar */}
						<div className="gap-2 border-zinc-800 px-4 py-2 bg-zinc-900/50 flex items-center justify-between border-b">
							{/* Language tabs */}
							<div className="gap-1 flex">
								{(["js", "python", "curl"] as Lang[]).map((l) => (
									<button
										key={l}
										type="button"
										onClick={() => setLang(l)}
										className={cn(
											"px-2.5 py-1 text-xs rounded-md transition-colors",
											lang === l
												? "bg-zinc-700/40 text-zinc-100"
												: "text-zinc-500 hover:text-zinc-300",
										)}
									>
										{l === "js"
											? "JavaScript"
											: l === "python"
												? "Python"
												: "cURL"}
									</button>
								))}
							</div>

							{/* Traffic lights + copy */}
							<div className="gap-3 flex items-center">
								<div className="gap-1.5 flex items-center">
									<span className="size-2.5 rounded-full bg-muted-foreground/20" />
									<span className="size-2.5 rounded-full bg-muted-foreground/30" />
									<span className="size-2.5 rounded-full bg-muted-foreground/40" />
								</div>
								<button
									type="button"
									onClick={copy}
									className="gap-1.5 px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 flex items-center rounded-md transition-colors"
									aria-label="Copy code"
								>
									{copied ? (
										<CheckIcon className="size-3 text-muted-foreground/60" />
									) : (
										<CopyIcon className="size-3" />
									)}
									<span>{copied ? "Copied!" : "Copy"}</span>
								</button>
							</div>
						</div>

						<pre className="p-5 font-mono leading-relaxed text-zinc-300 min-h-[220px] overflow-x-auto text-[13px]">
							<code>{code}</code>
						</pre>
					</div>

					<p className="mt-4 text-sm font-light text-center text-muted-foreground">
						<a
							href="/developers"
							className="text-primary underline-offset-4 hover:underline"
						>
							{t("homeQuickstart.cta")} →
						</a>
					</p>
				</div>
			</div>
		</section>
	);
}
