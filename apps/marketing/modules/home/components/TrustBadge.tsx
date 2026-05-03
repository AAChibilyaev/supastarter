"use client";

import { useTranslations } from "next-intl";

const TRUST_ITEMS = [
	{ key: "g2", rating: "4.9", label: "G2" },
	{ key: "capterra", rating: "4.8", label: "Capterra" },
	{ key: "companies", rating: "500+", label: null },
] as const;

export function TrustBadge() {
	const t = useTranslations("home");

	return (
		<div className="flex flex-wrap items-center gap-5">
			{TRUST_ITEMS.map((item) => (
				<div key={item.key} className="flex items-center gap-1.5">
					{item.key !== "companies" && (
						<div className="flex gap-0.5">
							{Array.from({ length: 5 }, (_, i) => (
								<svg key={i} className="size-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
									<title>★</title>
									<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
								</svg>
							))}
						</div>
					)}
					<span className="text-sm font-semibold text-foreground">{item.rating}</span>
					<span className="text-xs text-muted-foreground">
						{item.label ? `on ${item.label}` : t(`trustBadges.${item.key}`)}
					</span>
				</div>
			))}
		</div>
	);
}
