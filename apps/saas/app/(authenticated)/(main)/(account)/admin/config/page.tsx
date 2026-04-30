import { config } from "@config";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { PageHeader } from "@shared/components/PageHeader";

export default function AdminConfigPage() {
	return (
		<>
			<PageHeader
				title="Runtime config"
				subtitle="Read-only view of important runtime settings."
			/>

			<div className="gap-4 md:grid-cols-2 grid grid-cols-1">
				<Card>
					<CardHeader>
						<CardTitle>Application</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1 text-sm">
						<p>
							<span className="text-foreground/60">App name:</span> {config.appName}
						</p>
						<p>
							<span className="text-foreground/60">Default theme:</span>{" "}
							{config.defaultTheme}
						</p>
						<p>
							<span className="text-foreground/60">Enabled themes:</span>{" "}
							{config.enabledThemes.join(", ")}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>URLs</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1 text-sm">
						<p>
							<span className="text-foreground/60">SaaS URL:</span>{" "}
							{process.env.NEXT_PUBLIC_SAAS_URL ?? "not set"}
						</p>
						<p>
							<span className="text-foreground/60">Marketing URL:</span>{" "}
							{process.env.NEXT_PUBLIC_MARKETING_URL ?? "not set"}
						</p>
						<p>
							<span className="text-foreground/60">Docs URL:</span>{" "}
							{process.env.NEXT_PUBLIC_DOCS_URL ?? "not set"}
						</p>
					</CardContent>
				</Card>
			</div>
		</>
	);
}
