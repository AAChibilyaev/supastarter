import { Card, CardContent } from "@repo/ui/components/card";
import {
	KeyRoundIcon,
	Building2Icon,
	GlobeLockIcon,
	LogInIcon,
	FileCheckIcon,
	ShieldCheckIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

import { SecurityTokenVisual } from "../../visuals/scenes/SecurityTokenVisual";

interface SecurityItem {
	key: "scopedTokens" | "tenantIsolation" | "originRestriction" | "sso" | "compliance" | "sla";
	icon: ComponentType<{ className?: string }>;
}

const items: SecurityItem[] = [
	{ key: "scopedTokens", icon: KeyRoundIcon },
	{ key: "tenantIsolation", icon: Building2Icon },
	{ key: "originRestriction", icon: GlobeLockIcon },
	{ key: "sso", icon: LogInIcon },
	{ key: "compliance", icon: FileCheckIcon },
	{ key: "sla", icon: ShieldCheckIcon },
];

export function SecuritySection() {
	const t = useTranslations();

	return (
		<section className="section-padding border-b border-border bg-muted/30">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-light tracking-tight text-balance">
						{t("homeSecurity.title")}
					</h2>
					<p className="mt-4 text-lg font-light text-balance text-muted-foreground">
						{t("homeSecurity.subtitle")}
					</p>
				</div>

				<div className="mt-12 md:mt-16">
					<SecurityTokenVisual />
				</div>

				<div className="mt-8 sm:grid-cols-2 lg:grid-cols-3 gap-4 grid grid-cols-1">
					{items.map(({ key, icon: Icon }) => (
						<Card key={key}>
							<CardContent className="p-6 md:p-8 gap-4 flex flex-col">
								<div className="gap-4 flex items-center">
									<div className="size-10 flex shrink-0 items-center justify-center rounded-lg bg-muted">
										<Icon className="size-5 text-muted-foreground" />
									</div>
									<h3 className="text-lg font-light">
										{t(`homeSecurity.items.${key}.title`)}
									</h3>
								</div>
								<p className="text-sm font-light leading-relaxed text-pretty text-muted-foreground">
									{t(`homeSecurity.items.${key}.description`)}
								</p>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
