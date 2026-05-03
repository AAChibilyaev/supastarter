import { CheckIcon, LockIcon, ShieldCheckIcon } from "lucide-react";

import { VisualFrame } from "../components/VisualFrame";

const FLOW_NODES = [
	{ id: "app", label: "Browser / App", note: "No API key exposed" },
	{ id: "token", label: "Scoped Token", note: "HMAC · TTL: 1h" },
	{ id: "api", label: "Search API", note: "Origin verified" },
	{ id: "filter", label: "Tenant Filter", note: "tenant: acme" },
	{ id: "index", label: "Your Index", note: "Results returned" },
] as const;

const GUARANTEES = [
	"API key never sent to browser",
	"Each token scoped to one tenant",
	"Expired tokens auto-rejected",
	"Origin allowlist enforced",
	"Leaked token still harmless",
] as const;

function ArrowSvg() {
	return (
		<svg width="20" height="12" viewBox="0 0 20 12" fill="none" aria-hidden="true">
			<path
				d="M0 6H17M17 6L12 1M17 6L12 11"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function SecurityTokenVisual() {
	return (
		<VisualFrame className="p-5 md:p-6">
			{/* Header */}
			<div className="mb-5 gap-2 flex items-center">
				<div className="size-8 flex items-center justify-center rounded-lg bg-muted">
					<ShieldCheckIcon className="size-4 text-primary" />
				</div>
				<div>
					<p className="text-sm font-medium text-foreground">Scoped token flow</p>
					<p className="text-[11px] text-muted-foreground">Zero API key exposure</p>
				</div>
			</div>

			{/* Token flow */}
			<div className="mb-5 p-4 overflow-x-auto rounded-xl border border-border bg-muted/20">
				<div className="gap-2 flex min-w-max items-center">
					{FLOW_NODES.map((node, i) => (
						<div key={node.id} className="gap-2 flex items-center">
							<div className="px-4 py-2.5 min-w-[110px] rounded-lg border border-border bg-card text-center">
								<p className="text-xs font-medium whitespace-nowrap text-foreground">
									{node.label}
								</p>
								<p className="mt-0.5 text-[10px] whitespace-nowrap text-muted-foreground">
									{node.note}
								</p>
							</div>
							{i < FLOW_NODES.length - 1 && (
								<span className="text-muted-foreground/50">
									<ArrowSvg />
								</span>
							)}
						</div>
					))}
				</div>
			</div>

			{/* Guarantees + token payload */}
			<div className="gap-4 sm:grid-cols-[1fr_220px] grid">
				<div className="space-y-2">
					{GUARANTEES.map((g) => (
						<div key={g} className="gap-2.5 flex items-center">
							<div className="size-4 flex shrink-0 items-center justify-center rounded-full bg-muted">
								<CheckIcon className="size-2.5 text-primary" />
							</div>
							<span className="text-xs text-foreground">{g}</span>
						</div>
					))}
				</div>

				<div className="p-4 rounded-xl border border-border bg-muted/30">
					<div className="mb-3 gap-2 flex items-center">
						<LockIcon className="size-3.5 text-primary" />
						<p className="font-medium text-[11px] text-muted-foreground">
							Token payload
						</p>
					</div>
					<pre className="leading-relaxed overflow-x-auto text-[10px] text-foreground">
						<code>{`{
  "org": "acme",
  "ttl": 3600,
  "origin": "shop.acme.com",
  "filter": "tenant:acme",
  "scope": ["search"]
}`}</code>
					</pre>
					<div className="mt-3 gap-1.5 px-3 py-1.5 flex items-center rounded-lg border border-border bg-muted">
						<CheckIcon className="size-3 text-primary" />
						<span className="text-[10px] text-muted-foreground">Request allowed</span>
					</div>
				</div>
			</div>
		</VisualFrame>
	);
}
