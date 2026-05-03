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
  filter_by: 'tenant_id:acme', // tenant isolation
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
    "filter_by": "tenant_id:acme",
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
  '{"id":"1","title":"Nike Air Max 270","price":129.99,"brand":"Nike"}
{"id":"2","title":"Adidas Ultraboost 23","price":179.99,"brand":"Adidas"}'`,
		token: `curl -X POST https://api.aacsearch.com/v1/tokens \\
  -H "Authorization: Bearer ss_search_•••••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "ttl": 3600,
    "origins": ["myapp.com"],
    "filter_by": "tenant_id:acme"
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
					<div className="gap-1 flex flex-wrap mb-0">
						{STEPS.map((step, idx) => {
							const isActive = activeStep === step;
							const isDone = idx < STEPS.indexOf(activeStep);
							return (
								<button
									key={step}
									type="button"
									onClick={() => setActiveStep(step)}
									className={cn(
										"flex items-center gap-2 px-4 py-2.5 text-sm rounded-t-lg border border-b-0 transition-all",
										isActive
											? "bg-[#0d0d10] text-white/90 border-white/10"
											: "bg-muted/50 text-muted-foreground hover:text-foreground border-border",
									)}
								>
									<span
										className={cn(
											"size-4 text-[10px] rounded-md flex items-center justify-center font-semibold shrink-0",
											isDone
												? "bg-success/20 text-success"
												: isActive
													? "bg-white/10 text-white/70"
													: "bg-muted text-muted-foreground",
										)}
									>
										{isDone ? <CheckIcon className="size-2.5" /> : idx + 1}
									</span>
									<span className="hidden sm:inline">{STEP_SHORT[step]}</span>
								</button>
							);
						})}
					</div>

					{/* Code panel */}
					<div className="overflow-hidden rounded-b-xl rounded-tr-xl border border-white/10 bg-[#0d0d10]">
						{/* Toolbar */}
						<div className="flex items-center justify-between gap-2 border-b border-white/8 px-4 py-2 bg-white/[0.03]">
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
												? "bg-white/10 text-white/90"
												: "text-white/40 hover:text-white/60",
										)}
									>
										{l === "js" ? "JavaScript" : l === "python" ? "Python" : "cURL"}
									</button>
								))}
							</div>

							{/* Traffic lights + copy */}
							<div className="flex items-center gap-3">
								<div className="gap-1.5 flex items-center">
									<span className="size-2.5 bg-red-500/70 rounded-full" />
									<span className="size-2.5 bg-amber-500/70 rounded-full" />
									<span className="size-2.5 bg-emerald-500/70 rounded-full" />
								</div>
								<button
									type="button"
									onClick={copy}
									className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
									aria-label="Copy code"
								>
									{copied ? (
										<CheckIcon className="size-3 text-emerald-400" />
									) : (
										<CopyIcon className="size-3" />
									)}
									<span>{copied ? "Copied!" : "Copy"}</span>
								</button>
							</div>
						</div>

						<pre className="p-5 font-mono leading-relaxed overflow-x-auto text-[13px] text-white/75 min-h-[220px]">
							<code>{code}</code>
						</pre>
					</div>

					<p className="mt-4 text-center text-sm font-light text-muted-foreground">
						<a href="/developers" className="text-primary underline-offset-4 hover:underline">
							{t("homeQuickstart.cta")} →
						</a>
					</p>
				</div>
			</div>
		</section>
	);
}
