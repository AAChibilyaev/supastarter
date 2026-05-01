import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";
import {
	GaugeIcon,
	GlobeLockIcon,
	KeyRoundIcon,
	LockIcon,
	ScrollTextIcon,
	ShieldCheckIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

interface SecurityItem {
	key:
		| "keyHashing"
		| "scopedTokens"
		| "originAllowlist"
		| "rateLimiting"
		| "tenantIsolation"
		| "auditLog";
	icon: ComponentType<{ className?: string }>;
}

const items: SecurityItem[] = [
	{ key: "keyHashing", icon: KeyRoundIcon },
	{ key: "scopedTokens", icon: ShieldCheckIcon },
	{ key: "originAllowlist", icon: GlobeLockIcon },
	{ key: "rateLimiting", icon: GaugeIcon },
	{ key: "tenantIsolation", icon: LockIcon },
	{ key: "auditLog", icon: ScrollTextIcon },
];

const spanMap: Record<SecurityItem["key"], string> = {
	keyHashing: "md:col-span-2",
	scopedTokens: "md:col-span-1",
	originAllowlist: "md:col-span-1",
	rateLimiting: "md:col-span-1",
	tenantIsolation: "md:col-span-1",
	auditLog: "md:col-span-2",
};

export function SecurityGrid() {
	const t = useTranslations();

	return (
		<section className="py-24 border-b border-border/60">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
						{t("security.title")}
					</h2>
					<p className="mt-4 text-lg text-muted-foreground">
						{t("security.subtitle")}
					</p>
				</div>

				<div className="mt-16 gap-4 md:grid-cols-4 grid grid-cols-1">
					{items.map(({ key, icon: Icon }) => (
						<Card
							key={key}
							className={cn(
								"group transition-colors hover:border-primary/30 hover:bg-accent/5",
								spanMap[key],
							)}
						>
							<CardHeader>
								<div className="mb-3 size-10 flex items-center justify-center rounded-lg border border-border/60 bg-muted/50 transition-colors group-hover:border-primary/20 group-hover:bg-primary/5">
									<Icon className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
								</div>
								<CardTitle>{t(`security.items.${key}.title`)}</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription className="text-sm leading-relaxed">
									{t(`security.items.${key}.description`)}
								</CardDescription>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
