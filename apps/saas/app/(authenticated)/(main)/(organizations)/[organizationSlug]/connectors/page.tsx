import { getActiveOrganization, getSession } from "@auth/lib/server";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { getBaseUrl } from "@repo/utils";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const t = await getTranslations("search");
	const org = await getActiveOrganization(organizationSlug);
	return { title: `Connectors – ${org?.name ?? ""}` };
}

export default async function ConnectorsPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const [org, session] = await Promise.all([
		getActiveOrganization(organizationSlug),
		getSession(),
	]);
	if (!org || !session) return notFound();
	const baseUrl = getBaseUrl(process.env.NEXT_PUBLIC_SAAS_URL, 3000);

	return (
		<div className="space-y-6 p-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Connectors</h1>
				<p className="mt-1 text-muted-foreground">
					Connect your CMS to sync products into AACsearch.
				</p>
			</div>

			<div className="gap-6 md:grid-cols-2 grid">
				<Card>
					<CardHeader>
						<CardTitle>PrestaShop</CardTitle>
						<CardDescription>
							PrestaShop 8.x module for automatic product indexing.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="rounded p-4 bg-muted">
							<p className="text-sm font-medium mb-2">Installation:</p>
							<ol className="space-y-1 text-sm list-inside list-decimal text-muted-foreground">
								<li>
									Copy{" "}
									<code className="px-1 rounded bg-background">
										modules/aacsearch/
									</code>{" "}
									to your PrestaShop{" "}
									<code className="px-1 rounded bg-background">/modules</code>{" "}
									directory
								</li>
								<li>Go to Module Manager → find AACsearch → Install</li>
								<li>Open AACsearch settings under Catalog tab</li>
								<li>
									Enter your API URL:{" "}
									<code className="px-1 rounded bg-background">{baseUrl}</code>
								</li>
								<li>Create a connector API key from the Search dashboard</li>
								<li>Run full sync</li>
							</ol>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>1C-Bitrix</CardTitle>
						<CardDescription>
							1C-Bitrix 24+ module for catalog synchronization.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="rounded p-4 bg-muted">
							<p className="text-sm font-medium mb-2">Installation:</p>
							<ol className="space-y-1 text-sm list-inside list-decimal text-muted-foreground">
								<li>
									Copy{" "}
									<code className="px-1 rounded bg-background">
										local/modules/aac.search/
									</code>{" "}
									to your Bitrix{" "}
									<code className="px-1 rounded bg-background">
										/local/modules
									</code>{" "}
									directory
								</li>
								<li>Go to Marketplace → Modules → find aac.search → Install</li>
								<li>Open AACsearch settings page</li>
								<li>
									Enter your API URL:{" "}
									<code className="px-1 rounded bg-background">{baseUrl}</code>
								</li>
								<li>Select the catalog IBlock to sync</li>
								<li>Run full sync</li>
							</ol>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>REST API / SDK</CardTitle>
					<CardDescription>
						Upload documents programmatically without a CMS module.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="rounded p-4 bg-muted">
						<p className="text-sm mb-2 text-muted-foreground">
							Use the AACsearch API directly to index documents:
						</p>
						<pre className="text-sm overflow-x-auto">
							<code>{`# Upload documents in bulk
curl -X POST ${baseUrl}/api/v1/indexes/:indexId/documents:batch \\
  -H "Authorization: Bearer aa_write_***" \\
  -H "Content-Type: application/json" \\
  -d '{"documents": [{"external_id": "123", "title": "Product", ...}]}'`}</code>
						</pre>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
