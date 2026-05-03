import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { DemoSearchPage } from "../../../modules/demo/components/DemoSearchPage";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	return {
		title: "Live Demo — AACsearch Engine",
		description:
			"Try AACsearch with a pre-loaded fashion catalog. Search, filter, and see real-time results — no signup required.",
		openGraph: {
			title: "Live Demo — AACsearch Engine",
			description: "Try AACsearch with a pre-loaded fashion catalog. No signup required.",
		},
	};
}

export default async function DemoPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);

	return (
		<main className="pt-24 pb-16 min-h-screen">
			<div className="container">
				<div className="max-w-3xl mb-12 mx-auto text-center">
					<h1 className="text-4xl font-bold tracking-tight mb-4">Live Demo</h1>
					<p className="text-lg text-muted-foreground">
						Explore a pre-loaded fashion catalog powered by AACsearch. Search, filter by
						category, and experience real-time results.
					</p>
				</div>
				<DemoSearchPage />
			</div>
		</main>
	);
}
