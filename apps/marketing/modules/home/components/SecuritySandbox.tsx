"use client";

import { cn } from "@repo/ui";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type TtlOption = "valid" | "expired";
type OriginOption = "allowed" | "blocked";
type TenantOption = "match" | "mismatch";

type OutcomeType = "allowed" | "origin" | "tenant" | "expired" | "leak";

interface Outcome {
	type: OutcomeType;
	icon: string;
	color: string;
	bgColor: string;
	borderColor: string;
}

function computeOutcome(
	ttl: TtlOption,
	origin: OriginOption,
	tenant: TenantOption,
	leaked: boolean,
): OutcomeType {
	if (ttl === "expired") return "expired";
	if (origin === "blocked") return "origin";
	if (tenant === "mismatch") return "tenant";
	if (leaked) return "leak";
	return "allowed";
}

const FLOW_NODES = ["Browser / App", "Scoped Token", "Search API", "Index"];

export function SecuritySandbox() {
	const t = useTranslations("homeSecuritySandbox");

	const [ttl, setTtl] = useState<TtlOption>("valid");
	const [origin, setOrigin] = useState<OriginOption>("allowed");
	const [tenant, setTenant] = useState<TenantOption>("match");
	const [leaked, setLeaked] = useState(false);

	const outcomeType = computeOutcome(ttl, origin, tenant, leaked);

	const outcomes: Record<OutcomeType, Outcome> = useMemo(
		() => ({
			allowed: { type: "allowed", icon: "✓", color: "text-success", bgColor: "bg-success/10", borderColor: "border-success/30" },
			origin: { type: "origin", icon: "✗", color: "text-destructive", bgColor: "bg-destructive/10", borderColor: "border-destructive/30" },
			tenant: { type: "tenant", icon: "✗", color: "text-destructive", bgColor: "bg-destructive/10", borderColor: "border-destructive/30" },
			expired: { type: "expired", icon: "✗", color: "text-muted-foreground", bgColor: "bg-muted", borderColor: "border-border" },
			leak: { type: "leak", icon: "✓", color: "text-success", bgColor: "bg-success/10", borderColor: "border-success/30" },
		}),
		[],
	);

	const outcome = outcomes[outcomeType];

	const outcomeTextKey = `outcome${outcomeType.charAt(0).toUpperCase()}${outcomeType.slice(1)}` as
		| "outcomeAllowed"
		| "outcomeOrigin"
		| "outcomeTenant"
		| "outcomeExpired"
		| "outcomeLeak";

	const blockedAt: Record<OutcomeType, number | null> = {
		allowed: null,
		origin: 1,
		tenant: 2,
		expired: 1,
		leak: null,
	};
	const blockNode = blockedAt[outcomeType];

	return (
		<section className="section-padding border-b border-border bg-muted/10">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						{t("title")}
					</h2>
					<p className="mt-4 text-lg font-light text-balance text-muted-foreground">
						{t("subtitle")}
					</p>
				</div>

				<div className="mt-12 md:mt-16 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Controls */}
					<div className="rounded-xl border border-border bg-card p-6 md:p-8 space-y-6">
						<p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Token constraints</p>

						{/* TTL */}
						<ToggleField
							label={t("ttlLabel")}
							options={[
								{ value: "valid", label: "1 hour (valid)", active: ttl === "valid" },
								{ value: "expired", label: "Expired", active: ttl === "expired", danger: true },
							]}
							onChange={(v) => setTtl(v as TtlOption)}
						/>

						{/* Origin */}
						<ToggleField
							label={t("originLabel")}
							options={[
								{ value: "allowed", label: "myapp.com (allowed)", active: origin === "allowed" },
								{ value: "blocked", label: "attacker.site", active: origin === "blocked", danger: true },
							]}
							onChange={(v) => setOrigin(v as OriginOption)}
						/>

						{/* Tenant */}
						<ToggleField
							label={t("tenantLabel")}
							options={[
								{ value: "match", label: "tenant_id = acme", active: tenant === "match" },
								{ value: "mismatch", label: "tenant_id = evil", active: tenant === "mismatch", danger: true },
							]}
							onChange={(v) => setTenant(v as TenantOption)}
						/>

						{/* Token leak */}
						<div>
							<p className="text-xs font-light text-muted-foreground mb-2">{t("leakLabel")}</p>
							<button
								type="button"
								onClick={() => setLeaked((p) => !p)}
								className={cn(
									"relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none",
									leaked ? "bg-muted-foreground/30" : "bg-muted",
								)}
								role="switch"
								aria-checked={leaked}
							>
								<span
									className={cn(
										"pointer-events-none inline-block size-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
										leaked ? "translate-x-5" : "translate-x-0",
									)}
								/>
							</button>
						</div>
					</div>

					{/* Visual flow + outcome */}
					<div className="flex flex-col gap-4">
						{/* Flow diagram */}
						<div className="rounded-xl border border-border bg-card p-6">
							<p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-5">Request flow</p>
							<div className="space-y-2">
								{FLOW_NODES.map((node, i) => {
									const isBlocked = blockNode === i;
									const isPast = blockNode !== null && i > blockNode;
									const isActive = blockNode === null || i <= blockNode;
									return (
										<div key={node} className="flex items-center gap-2">
											<div
												className={cn(
													"flex-1 rounded-lg border px-3 py-2 text-sm font-light transition-all duration-300",
													isBlocked
														? "border-destructive/40 bg-destructive/10 text-destructive"
														: isPast
															? "border-border/40 bg-muted/20 text-muted-foreground/40"
															: isActive && outcomeType === "allowed"
																? "border-success/30 bg-success/5 text-foreground"
																: "border-border bg-muted/30 text-foreground",
												)}
											>
												{node}
												{isBlocked && (
													<span className="ml-2 text-[10px] font-medium opacity-70">
														{outcomeType === "expired" ? "401" : "403"} →
													</span>
												)}
											</div>
											{i < FLOW_NODES.length - 1 && (
												<div className={cn("text-base transition-all", isPast ? "text-muted-foreground/20" : "text-muted-foreground/40")}>
													↓
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>

						{/* Outcome badge */}
						<div className={cn("rounded-xl border p-5 flex items-start gap-3 transition-all duration-300", outcome.bgColor, outcome.borderColor)}>
							<span className={cn("text-2xl font-bold leading-none mt-0.5", outcome.color)}>
								{outcome.icon}
							</span>
							<div>
								<p className={cn("text-sm font-semibold", outcome.color)}>
									{t(outcomeTextKey)}
								</p>
								{outcomeType === "allowed" && (
									<p className="mt-1 text-xs font-light text-muted-foreground">
										Token valid · Origin trusted · Tenant matched · filter_by: tenant_id=acme applied
									</p>
								)}
								{outcomeType === "leak" && (
									<p className="mt-1 text-xs font-light text-muted-foreground">
										Scoped tokens only allow search. Even if leaked, attacker cannot access Admin API, read other tenants, or modify indexes.
									</p>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Sub-component ────────────────────────────────────────────────────────────

interface ToggleOption {
	value: string;
	label: string;
	active: boolean;
	danger?: boolean;
}

function ToggleField({
	label,
	options,
	onChange,
}: {
	label: string;
	options: ToggleOption[];
	onChange: (value: string) => void;
}) {
	return (
		<div>
			<p className="text-xs font-light text-muted-foreground mb-2">{label}</p>
			<div className="gap-2 flex flex-wrap">
				{options.map((opt) => (
					<button
						key={opt.value}
						type="button"
						onClick={() => onChange(opt.value)}
						className={cn(
							"px-3 py-1.5 text-xs rounded-lg border transition-all",
							opt.active && opt.danger
								? "bg-destructive/10 border-destructive/40 text-destructive"
								: opt.active
									? "bg-success/10 border-success/30 text-success"
									: "border-border bg-muted/30 text-muted-foreground hover:text-foreground",
						)}
					>
						{opt.label}
					</button>
				))}
			</div>
		</div>
	);
}
