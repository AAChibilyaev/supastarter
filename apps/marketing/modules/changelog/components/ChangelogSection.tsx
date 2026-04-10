"use client";

import { useFormatter } from "next-intl";
import type { ReactNode } from "react";

export type ChangelogItem = {
	date: string;
	title: string;
	changes: ReactNode[];
};

export function ChangelogSection() {
	const formatter = useFormatter();

	const items: ChangelogItem[] = [
		{
			date: "2026-01-30",
			title: "Performance Improvements",
			changes: ["🚀 Improved performance"],
		},
		{
			date: "2026-01-26",
			title: "Design Updates",
			changes: ["🎨 Updated design", "🐞 Fixed a bug"],
		},
		{
			date: "2026-01-12",
			title: "New Features",
			changes: ["🎉 Added new feature", "🐞 Fixed a bug"],
		},
	];

	return (
		<section id="changelog">
			<div className="max-w-xl gap-4 mx-auto grid w-full grid-cols-1 text-left">
				{items?.map((item, i) => (
					<div key={i} className="p-6 rounded-3xl border bg-muted">
						<div className="gap-1 flex flex-col items-start">
							<small className="font-medium tracking-wide text-xs whitespace-nowrap text-primary uppercase">
								{formatter.dateTime(new Date(item.date))}
							</small>

							<h2 className="text-xl font-semibold">{item.title}</h2>
						</div>
						<ul className="mt-4 space-y-2 pl-6 list-disc">
							{item.changes.map((change, j) => (
								<li key={j}>{change}</li>
							))}
						</ul>
					</div>
				))}
			</div>
		</section>
	);
}
