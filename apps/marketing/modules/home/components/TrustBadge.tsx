"use client";

import { useTranslations } from "next-intl";

interface TrustBadgeItem {
	key: string;
	rating: string;
	maxRating?: string;
	labelKey: string;
	showStars?: boolean;
	stars?: number;
}

const TRUST_BADGES: TrustBadgeItem[] = [
	{
		key: "g2",
		rating: "4.9",
		maxRating: "5",
		labelKey: "trustBadges.g2",
		showStars: true,
		stars: 5,
	},
	{
		key: "capterra",
		rating: "4.8",
		maxRating: "5",
		labelKey: "trustBadges.capterra",
		showStars: true,
		stars: 5,
	},
	{
		key: "companies",
		rating: "500+",
		labelKey: "trustBadges.companies",
		showStars: false,
		stars: 0,
	},
];

export function TrustBadge() {
	const t = useTranslations("home");

	return (
		<div className="gap-4 flex flex-wrap items-center">
			{TRUST_BADGES.map((badge) => (
				<div
					key={badge.key}
					className="gap-2 px-3 py-2 flex items-center rounded-xl border border-border/30 bg-card/50"
				>
					{badge.showStars && badge.stars && (
						<div className="gap-0.5 flex">
							{Array.from({ length: badge.stars }, (_, i) => (
								<svg
									key={i}
									className="size-3.5 text-amber-400"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<title>Star</title>
									<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
								</svg>
							))}
						</div>
					)}
					<span className="text-sm font-semibold whitespace-nowrap text-foreground">
						{badge.rating}
						{badge.maxRating && (
							<span className="text-muted-foreground/60 font-normal">
								/{badge.maxRating}
							</span>
						)}
					</span>
					<span className="text-xs text-muted-foreground">{t(badge.labelKey)}</span>
				</div>
			))}
		</div>
	);
}
