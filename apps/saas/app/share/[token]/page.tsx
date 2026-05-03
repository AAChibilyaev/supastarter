import type { Metadata } from "next";

import { SharedSearchView } from "../../../modules/my-search/components/SharedSearchView";

export const metadata: Metadata = {
	title: "Shared Search — AACsearch Engine",
	description: "View shared search results",
};

interface Props {
	params: Promise<{ token: string }>;
}

export default async function SharedSearchPage({ params }: Props) {
	const { token } = await params;

	return (
		<main className="min-h-screen bg-background">
			<div className="max-w-6xl px-4 py-8 mx-auto">
				<div className="mb-8 text-center">
					<h1 className="text-2xl font-bold tracking-tight">Shared Search</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Powered by AACsearch Engine
					</p>
				</div>
				<SharedSearchView token={token} />
			</div>
		</main>
	);
}
